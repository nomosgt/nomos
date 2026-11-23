import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

/** Sala · Reuniões — cliente solicita e acompanha as próprias reuniões. */

async function requireCliente() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("client_profiles").select("user_id, nome, empresa").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: prof.nome as string, empresa: (prof.empresa as string) || null } : null;
}

function hintV26(msg: string) {
  return /does not exist|schema cache|relation/i.test(msg) ? "Recurso ainda não habilitado (v26 pendente no banco)." : null;
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const cli = await requireCliente();
  if (!cli) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reunioes")
    .select("id, titulo, detalhes, data_sugerida, data_confirmada, status, criado_em")
    .eq("client_id", cli.id)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) {
    const hint = hintV26(error.message);
    if (hint) return NextResponse.json({ reunioes: [], aviso: hint });
    return NextResponse.json({ error: "Falha ao listar" }, { status: 500 });
  }
  return NextResponse.json({ reunioes: data ?? [] });
}

const postSchema = z.object({
  titulo: z.string().min(3).max(200),
  detalhes: z.string().max(2000).optional().nullable(),
  data_sugerida: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const cli = await requireCliente();
  if (!cli) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: novo, error } = await admin.from("reunioes").insert({
    solicitante_tipo: "cliente",
    client_id: cli.id,
    solicitante_nome: cli.nome,
    titulo: parsed.data.titulo.trim(),
    detalhes: parsed.data.detalhes?.trim() || null,
    data_sugerida: parsed.data.data_sugerida || null,
  }).select("id").single();
  if (error) {
    const hint = hintV26(error.message);
    return NextResponse.json({ error: hint || "Falha ao solicitar" }, { status: hint ? 503 : 500 });
  }
  if (novo) {
    await notificar(admin, {
      destinatario_tipo: "admin", evento: "reuniao",
      titulo: `Reunião solicitada: ${parsed.data.titulo.trim()} (${cli.empresa || cli.nome})`,
      referencia_tipo: "reuniao", referencia_id: novo.id,
      dedup_key: `reuniao:${novo.id}`,
    });
  }
  return NextResponse.json({ ok: true });
}
