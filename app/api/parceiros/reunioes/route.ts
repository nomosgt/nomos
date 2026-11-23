import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

/** Central do Parceiro · Reuniões — colaborador solicita e acompanha. */

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("parceiros_codigos").select("id, nome, ativo").eq("cookie_hash", m[1]).maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiro: data };
}

function v26Ausente(msg: string) {
  return /does not exist|schema cache|relation/i.test(msg);
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const { data, error } = await ctx.admin
    .from("reunioes")
    .select("id, titulo, detalhes, data_sugerida, data_confirmada, status, criado_em")
    .eq("parceiro_id", ctx.parceiro.id)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) {
    if (v26Ausente(error.message)) return NextResponse.json({ reunioes: [], aviso: "Recurso ainda não habilitado (v26 pendente)." });
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
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const { data: novo, error } = await ctx.admin.from("reunioes").insert({
    solicitante_tipo: "parceiro",
    parceiro_id: ctx.parceiro.id,
    solicitante_nome: ctx.parceiro.nome,
    titulo: parsed.data.titulo.trim(),
    detalhes: parsed.data.detalhes?.trim() || null,
    data_sugerida: parsed.data.data_sugerida || null,
  }).select("id").single();
  if (error) {
    if (v26Ausente(error.message)) return NextResponse.json({ error: "Recurso ainda não habilitado (v26 pendente)." }, { status: 503 });
    return NextResponse.json({ error: "Falha ao solicitar" }, { status: 500 });
  }
  if (novo) {
    await notificar(ctx.admin, {
      destinatario_tipo: "admin", evento: "reuniao",
      titulo: `Reunião solicitada: ${parsed.data.titulo.trim()} (${ctx.parceiro.nome})`,
      referencia_tipo: "reuniao", referencia_id: novo.id,
      dedup_key: `reuniao:${novo.id}`,
    });
  }
  return NextResponse.json({ ok: true });
}
