import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

/** Central do Parceiro · Indicações — colaborador indica empresas; acompanha o status. */

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
    .from("indicacoes")
    .select("id, empresa, contato_nome, contato_email, contato_telefone, observacao, status, criado_em")
    .eq("parceiro_id", ctx.parceiro.id)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) {
    if (v26Ausente(error.message)) return NextResponse.json({ indicacoes: [], aviso: "Recurso ainda não habilitado (v26 pendente)." });
    return NextResponse.json({ error: "Falha ao listar" }, { status: 500 });
  }
  return NextResponse.json({ indicacoes: data ?? [] });
}

const postSchema = z.object({
  empresa: z.string().min(2).max(200),
  contato_nome: z.string().max(140).optional().nullable(),
  contato_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  contato_telefone: z.string().max(40).optional().nullable(),
  observacao: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const d = parsed.data;

  const { data: novo, error } = await ctx.admin.from("indicacoes").insert({
    parceiro_id: ctx.parceiro.id,
    parceiro_nome: ctx.parceiro.nome,
    empresa: d.empresa.trim(),
    contato_nome: d.contato_nome?.trim() || null,
    contato_email: d.contato_email?.trim() || null,
    contato_telefone: d.contato_telefone?.trim() || null,
    observacao: d.observacao?.trim() || null,
  }).select("id").single();
  if (error) {
    if (v26Ausente(error.message)) return NextResponse.json({ error: "Recurso ainda não habilitado (v26 pendente)." }, { status: 503 });
    return NextResponse.json({ error: "Falha ao registrar" }, { status: 500 });
  }
  if (novo) {
    await notificar(ctx.admin, {
      destinatario_tipo: "admin", evento: "indicacao",
      titulo: `Indicação nova: ${d.empresa.trim()} (${ctx.parceiro.nome})`,
      referencia_tipo: "indicacao", referencia_id: novo.id,
      dedup_key: `indicacao:${novo.id}`,
    });
  }
  return NextResponse.json({ ok: true });
}
