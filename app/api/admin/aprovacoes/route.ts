import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return prof ? u.user : null;
}

/** GET ?client_id= → aprovações (com anexos). ?id= → uma aprovação + anexos + eventos. */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ aprovacoes: [] });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const admin = createAdminClient();

  if (sp.get("id")) {
    const id = sp.get("id")!;
    const { data: apr } = await admin.from("client_aprovacoes").select("*").eq("id", id).maybeSingle();
    if (!apr) return NextResponse.json({ error: "Nao encontrada" }, { status: 404 });
    const [{ data: anexos }, { data: eventos }] = await Promise.all([
      admin.from("case_documents").select("id, nome, storage_path, tipo_mime, tamanho_bytes, created_at").eq("aprovacao_id", id).eq("arquivado", false),
      admin.from("aprovacao_eventos").select("evento, detalhe, autor, created_at").eq("aprovacao_id", id).order("created_at", { ascending: false }),
    ]);
    return NextResponse.json({ aprovacao: apr, anexos: anexos ?? [], eventos: eventos ?? [] });
  }

  const clientId = sp.get("client_id");
  let q = admin.from("client_aprovacoes").select("*").order("created_at", { ascending: false }).limit(100);
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  // anexos por aprovação (uma consulta)
  const ids = (data ?? []).map((a) => a.id);
  const anexosPorApr: Record<string, unknown[]> = {};
  if (ids.length) {
    const { data: docs } = await admin.from("case_documents").select("id, nome, storage_path, aprovacao_id").in("aprovacao_id", ids).eq("arquivado", false);
    for (const d of docs ?? []) {
      const k = d.aprovacao_id as string;
      (anexosPorApr[k] ||= []).push(d);
    }
  }
  const aprovacoes = (data ?? []).map((a) => ({ ...a, anexos: anexosPorApr[a.id] ?? [] }));
  return NextResponse.json({ aprovacoes });
}

const num = z.union([z.number(), z.string()]).optional().nullable().transform((v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
});

const postSchema = z.object({
  client_id: z.string().uuid(),
  case_id: z.string().uuid().nullable().optional(),
  titulo: z.string().min(3).max(200),
  corpo: z.string().min(3).max(4000),
  valor_credito: num,
  tributos: z.string().max(400).optional().nullable(),
  periodo_apuracao: z.string().max(200).optional().nullable(),
  modalidade: z.string().max(200).optional().nullable(),
  inicio_previsto: z.string().max(200).optional().nullable(),
  impacto_caixa: z.string().max(400).optional().nullable(),
  fundamentacao: z.string().max(600).optional().nullable(),
  risco: z.string().max(120).optional().nullable(),
  honorarios: z.string().max(200).optional().nullable(),
  prazo_decisao: z.string().optional().nullable(),
  anexo_ids: z.array(z.string().uuid()).optional(), // case_documents a vincular
});

/** POST — cria uma aprovação rica e vincula anexos (documentos do caso). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const d = parsed.data;

  let prazoISO: string | null = null;
  if (d.prazo_decisao) { const dt = new Date(d.prazo_decisao); if (!isNaN(dt.getTime())) prazoISO = dt.toISOString(); }

  const admin = createAdminClient();
  const { data: apr, error } = await admin.from("client_aprovacoes").insert({
    client_id: d.client_id,
    case_id: d.case_id ?? null,
    origem: "admin",
    origem_nome: "Equipe Arché",
    titulo: d.titulo,
    corpo: d.corpo,
    valor_credito: d.valor_credito,
    tributos: d.tributos || null,
    periodo_apuracao: d.periodo_apuracao || null,
    modalidade: d.modalidade || null,
    inicio_previsto: d.inicio_previsto || null,
    impacto_caixa: d.impacto_caixa || null,
    fundamentacao: d.fundamentacao || null,
    risco: d.risco || null,
    honorarios: d.honorarios || null,
    prazo_decisao: prazoISO,
  }).select("id").single();
  if (error || !apr) {
    const hint = /does not exist|schema cache|column/i.test(error?.message || "") ? "Rode o SQL do aprovacoes-v15 no Supabase." : "Falha ao enviar.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  // vincula anexos selecionados (documentos já no caso) — rastreável, sem duplicar arquivo
  if (d.anexo_ids?.length) {
    await admin.from("case_documents").update({ aprovacao_id: apr.id }).in("id", d.anexo_ids);
  }
  await admin.from("aprovacao_eventos").insert({ aprovacao_id: apr.id, evento: "criada", detalhe: d.titulo, autor: "Equipe Arché" }).then(() => {}, () => {});
  return NextResponse.json({ ok: true, id: apr.id });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  acao: z.literal("reapresentar"),
  corpo: z.string().min(3).max(4000).optional(),
  valor_credito: num,
  prazo_decisao: z.string().optional().nullable(),
});

/** PATCH acao=reapresentar — reabre uma aprovação em ajuste, incrementando a revisão. */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: apr } = await admin.from("client_aprovacoes").select("id, status, revisao").eq("id", parsed.data.id).maybeSingle();
  if (!apr) return NextResponse.json({ error: "Nao encontrada" }, { status: 404 });
  if (apr.status !== "ajuste_solicitado") {
    return NextResponse.json({ error: "Só é possível reapresentar uma aprovação que está 'ajuste solicitado'." }, { status: 409 });
  }

  const updates: Record<string, unknown> = {
    status: "pendente",
    revisao: (apr.revisao ?? 0) + 1,
    resposta: null, respondido_em: null,
    ajuste_motivo: null, ajuste_obs: null, ajuste_solicitado_em: null,
  };
  if (parsed.data.corpo) updates.corpo = parsed.data.corpo;
  if (parsed.data.valor_credito != null) updates.valor_credito = parsed.data.valor_credito;
  if (parsed.data.prazo_decisao) { const dt = new Date(parsed.data.prazo_decisao); if (!isNaN(dt.getTime())) updates.prazo_decisao = dt.toISOString(); }

  const { error } = await admin.from("client_aprovacoes").update(updates).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Falha ao reapresentar" }, { status: 500 });
  await admin.from("aprovacao_eventos").insert({ aprovacao_id: parsed.data.id, evento: "reapresentada", detalhe: `revisão ${(apr.revisao ?? 0) + 1}`, autor: "Equipe Arché" }).then(() => {}, () => {});
  return NextResponse.json({ ok: true });
}
