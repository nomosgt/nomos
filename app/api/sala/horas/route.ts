import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Sala · Horas técnicas — o cliente vê estimativas, aprova/recusa
 * (anti-race) e pode solicitar uma nova estimativa à Arché.
 */

async function requireCliente() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("client_profiles").select("user_id, nome, empresa").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: prof.nome as string, empresa: (prof.empresa as string) || null } : null;
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const cli = await requireCliente();
  if (!cli) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("horas_estimativas")
    .select("id, titulo, descricao, horas, valor, status, decidido_em, criado_em")
    .eq("client_id", cli.id)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return NextResponse.json({ estimativas: [], aviso: "Recurso ainda não habilitado (v26 pendente)." });
    }
    return NextResponse.json({ error: "Falha ao listar" }, { status: 500 });
  }
  return NextResponse.json({ estimativas: data ?? [] });
}

/** POST — cliente solicita estimativa de horas. */
const postSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().max(2000).optional().nullable(),
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
  const { data: novo, error } = await admin.from("horas_estimativas").insert({
    client_id: cli.id,
    titulo: parsed.data.titulo.trim(),
    descricao: parsed.data.descricao?.trim() || null,
    horas: 1, // placeholder obrigatório (>0); Arché define na resposta
    status: "solicitada_cliente",
  }).select("id").single();
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return NextResponse.json({ error: "Recurso ainda não habilitado (v26 pendente)." }, { status: 503 });
    }
    return NextResponse.json({ error: "Falha ao solicitar" }, { status: 500 });
  }
  if (novo) {
    await notificar(admin, {
      destinatario_tipo: "admin", evento: "horas_solicitadas",
      titulo: `Horas técnicas solicitadas: ${parsed.data.titulo.trim()} (${cli.empresa || cli.nome})`,
      referencia_tipo: "horas", referencia_id: novo.id,
      dedup_key: `horas_sol:${novo.id}`,
    });
  }
  return NextResponse.json({ ok: true });
}

/** PATCH — cliente decide uma estimativa aguardando aprovação. */
const patchSchema = z.object({
  id: z.string().uuid(),
  decisao: z.enum(["aprovada", "recusada"]),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const cli = await requireCliente();
  if (!cli) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  // ownership + anti-race no mesmo update
  const { data: upd, error } = await admin
    .from("horas_estimativas")
    .update({ status: parsed.data.decisao, decidido_em: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("client_id", cli.id)
    .eq("status", "aguardando_aprovacao")
    .select("id, titulo");
  if (error) return NextResponse.json({ error: "Falha ao decidir" }, { status: 500 });
  if (!upd || upd.length === 0) {
    return NextResponse.json({ error: "Estimativa não encontrada ou já decidida." }, { status: 409 });
  }
  await notificar(admin, {
    destinatario_tipo: "admin", evento: "horas_decididas",
    titulo: `Horas ${parsed.data.decisao === "aprovada" ? "aprovadas" : "recusadas"}: ${upd[0].titulo} (${cli.empresa || cli.nome})`,
    referencia_tipo: "horas", referencia_id: upd[0].id,
    dedup_key: `horas_dec:${upd[0].id}`,
  });
  return NextResponse.json({ ok: true });
}
