import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Central do Colaborador · Minhas análises.
 * GET            → lista das próprias análises
 * GET ?id=       → detalhe (própria) + anexos + eventos
 * POST           → cria rascunho (empresa/caso/atividade só dos vínculos autorizados)
 * PATCH          → salvar campos (rascunho/ajustes) | acao:"enviar" (rascunho→enviada;
 *                  ajustes→enviada com versao+1 = reenvio). Aprovada é imutável.
 */

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("parceiros_codigos").select("id, nome, ativo").eq("cookie_hash", m[1]).maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiro: data };
}

function hintV23(msg: string) {
  return /does not exist|schema cache|relation/i.test(msg) ? "Rode o SQL do central-v23 no Supabase." : null;
}

/** Empresas autorizadas ao colaborador: vínculo direto (clientes-v8) OU atividade atribuída. */
async function clienteAutorizado(admin: ReturnType<typeof createAdminClient>, parceiroId: string, clientId: string): Promise<boolean> {
  const { data: v } = await admin.from("parceiro_clientes").select("client_id").eq("parceiro_id", parceiroId).eq("client_id", clientId).maybeSingle();
  if (v) return true;
  const { data: a } = await admin.from("atividades").select("id").eq("parceiro_id", parceiroId).eq("client_id", clientId).limit(1);
  return Boolean(a && a.length);
}

const CAMPOS_TEXTO = ["titulo", "periodo_analisado", "objetivo", "dados_utilizados", "diagnostico", "oportunidades", "riscos", "recomendacoes", "conclusao"] as const;

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const id = sp.get("id");
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
    const { data: a, error } = await ctx.admin.from("analises")
      .select("*, client_profiles ( nome, empresa ), client_cases ( titulo )")
      .eq("id", id).eq("parceiro_id", ctx.parceiro.id).maybeSingle();
    if (error) return NextResponse.json({ error: hintV23(error.message) || "Falha" }, { status: 503 });
    if (!a) return NextResponse.json({ error: "Nao encontrada" }, { status: 404 });
    const [{ data: anexos }, { data: eventos }] = await Promise.all([
      ctx.admin.from("analise_anexos").select("id, nome, tamanho_bytes, created_at").eq("analise_id", id),
      ctx.admin.from("analise_eventos").select("evento, detalhe, autor, created_at").eq("analise_id", id).order("created_at", { ascending: false }),
    ]);
    return NextResponse.json({ analise: a, anexos: anexos ?? [], eventos: eventos ?? [] });
  }

  const { data, error } = await ctx.admin.from("analises")
    .select("id, titulo, status, versao, updated_at, enviada_em, comentario_revisao, client_profiles ( nome, empresa )")
    .eq("parceiro_id", ctx.parceiro.id)
    .order("updated_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ analises: [], aviso: hintV23(error.message) || undefined });
  return NextResponse.json({ analises: data ?? [] });
}

const postSchema = z.object({
  titulo: z.string().min(3).max(240),
  client_id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid().optional().nullable(),
  atividade_id: z.string().uuid().optional().nullable(),
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

  // autorização: empresa só se vinculada; atividade só se própria (e herda client/case dela)
  let clientId = d.client_id || null;
  let caseId = d.case_id || null;
  if (d.atividade_id) {
    const { data: ativ } = await ctx.admin.from("atividades").select("id, parceiro_id, client_id, case_id").eq("id", d.atividade_id).maybeSingle();
    if (!ativ || ativ.parceiro_id !== ctx.parceiro.id) return NextResponse.json({ error: "Atividade nao encontrada" }, { status: 404 });
    clientId = clientId ?? ativ.client_id;
    caseId = caseId ?? ativ.case_id;
  }
  if (clientId && !(await clienteAutorizado(ctx.admin, ctx.parceiro.id, clientId))) {
    return NextResponse.json({ error: "Empresa nao autorizada para este colaborador." }, { status: 403 });
  }

  const { data: nova, error } = await ctx.admin.from("analises").insert({
    parceiro_id: ctx.parceiro.id, parceiro_nome: ctx.parceiro.nome,
    client_id: clientId, case_id: caseId, atividade_id: d.atividade_id || null,
    titulo: d.titulo.trim(), status: "rascunho",
  }).select("id").single();
  if (error || !nova) return NextResponse.json({ error: hintV23(error?.message || "") || "Falha ao criar" }, { status: 503 });

  await ctx.admin.from("analise_eventos").insert({ analise_id: nova.id, evento: "criada", autor: ctx.parceiro.nome }).then(() => {}, () => {});
  return NextResponse.json({ ok: true, id: nova.id });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  acao: z.enum(["salvar", "enviar"]).optional(),
  titulo: z.string().min(3).max(240).optional(),
  periodo_analisado: z.string().max(200).optional().nullable(),
  objetivo: z.string().max(2000).optional().nullable(),
  dados_utilizados: z.string().max(4000).optional().nullable(),
  diagnostico: z.string().max(12000).optional().nullable(),
  oportunidades: z.string().max(8000).optional().nullable(),
  riscos: z.string().max(8000).optional().nullable(),
  recomendacoes: z.string().max(8000).optional().nullable(),
  conclusao: z.string().max(8000).optional().nullable(),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, acao, ...campos } = parsed.data;

  const { data: atual } = await ctx.admin.from("analises").select("id, parceiro_id, status, versao").eq("id", id).maybeSingle();
  if (!atual || atual.parceiro_id !== ctx.parceiro.id) return NextResponse.json({ error: "Nao encontrada" }, { status: 404 });

  // aprovada/arquivada são imutáveis pelo colaborador; enviada/em_revisao travadas até o admin decidir
  const editavel = atual.status === "rascunho" || atual.status === "ajustes_solicitados";
  if (!editavel) return NextResponse.json({ error: "Esta análise está em revisão ou finalizada — não pode ser alterada agora." }, { status: 409 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const c of CAMPOS_TEXTO) {
    if (campos[c] !== undefined) updates[c] = campos[c] === "" ? null : campos[c];
  }

  if (acao === "enviar") {
    const reenvio = atual.status === "ajustes_solicitados";
    updates.status = "enviada";
    updates.enviada_em = new Date().toISOString();
    if (reenvio) updates.versao = (atual.versao ?? 1) + 1;
    // guarda anti-corrida: só envia a partir do estado atual lido
    const { data: ok, error } = await ctx.admin.from("analises").update(updates).eq("id", id).eq("status", atual.status).select("id");
    if (error) return NextResponse.json({ error: "Falha ao enviar" }, { status: 500 });
    if (!ok || !ok.length) return NextResponse.json({ error: "A análise mudou de estado — recarregue." }, { status: 409 });
    await ctx.admin.from("analise_eventos").insert({
      analise_id: id, evento: reenvio ? "reenviada" : "enviada",
      detalhe: reenvio ? `revisão ${(atual.versao ?? 1) + 1}` : null, autor: ctx.parceiro.nome,
    }).then(() => {}, () => {});
    await notificar(ctx.admin, {
      destinatario_tipo: "admin", evento: "analise_enviada",
      titulo: `${ctx.parceiro.nome} enviou análise para revisão${reenvio ? ` (rev ${(atual.versao ?? 1) + 1})` : ""}`,
      referencia_tipo: "analise", referencia_id: id,
      dedup_key: `analise_enviada:${id}:v${reenvio ? (atual.versao ?? 1) + 1 : atual.versao ?? 1}`,
    });
    return NextResponse.json({ ok: true, status: "enviada" });
  }

  const { error } = await ctx.admin.from("analises").update(updates).eq("id", id).in("status", ["rascunho", "ajustes_solicitados"]);
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  await ctx.admin.from("analise_eventos").insert({ analise_id: id, evento: "salva", autor: ctx.parceiro.nome }).then(() => {}, () => {});
  return NextResponse.json({ ok: true });
}
