import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

const BUCKET = "case-documents";

/**
 * Admin · Análises da Equipe.
 * GET ?status=&parceiro_id=&client_id=  → lista com joins
 * GET ?id=                               → detalhe + anexos + eventos + cadeia de versões
 * GET ?baixar=<anexoId>                  → URL assinada do anexo
 * PATCH { id, acao, comentario? }        → iniciar_revisao | ajustes | aprovar | arquivar
 *   Transições validadas no backend + guarda anti-corrida (.eq status lido).
 *   Aprovada é imutável: correção posterior = nova análise do colaborador.
 */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id, nome").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: (prof as { nome?: string }).nome || "Admin" } : null;
}

function hintV23(msg: string) {
  return /does not exist|schema cache|relation/i.test(msg) ? "Rode o SQL do central-v23 (e v24) no Supabase." : null;
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();
  const sp = new URL(req.url).searchParams;

  const baixar = sp.get("baixar");
  if (baixar) {
    if (!/^[0-9a-f-]{36}$/i.test(baixar)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
    const { data: anexo } = await admin.from("analise_anexos").select("storage_path, nome").eq("id", baixar).maybeSingle();
    if (!anexo) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    const modo = sp.get("modo") === "baixar" ? "baixar" : "ver";
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(anexo.storage_path, 600, modo === "baixar" ? { download: anexo.nome } : undefined);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "Erro gerando link" }, { status: 500 });
    return NextResponse.redirect(data.signedUrl, { status: 303 });
  }

  const id = sp.get("id");
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
    const { data: a, error } = await admin.from("analises")
      .select("*, client_profiles ( nome, empresa ), client_cases ( titulo ), atividades ( titulo, prazo )")
      .eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: hintV23(error.message) || "Falha" }, { status: 503 });
    if (!a) return NextResponse.json({ error: "Nao encontrada" }, { status: 404 });
    const [{ data: anexos }, { data: eventos }] = await Promise.all([
      admin.from("analise_anexos").select("id, nome, tamanho_bytes, uploader_nome, created_at").eq("analise_id", id),
      admin.from("analise_eventos").select("evento, detalhe, autor, created_at").eq("analise_id", id).order("created_at", { ascending: false }),
    ]);
    // cadeia de versões anteriores (aprovadas preservadas)
    const versoes: { id: string; titulo: string; versao: number; status: string; created_at: string }[] = [];
    let anterior = (a as { versao_anterior?: string | null }).versao_anterior;
    for (let i = 0; i < 20 && anterior; i++) {
      const { data: v } = await admin.from("analises").select("id, titulo, versao, status, created_at, versao_anterior").eq("id", anterior).maybeSingle();
      if (!v) break;
      versoes.push({ id: v.id, titulo: v.titulo, versao: v.versao, status: v.status, created_at: v.created_at });
      anterior = (v as { versao_anterior?: string | null }).versao_anterior;
    }
    return NextResponse.json({ analise: a, anexos: anexos ?? [], eventos: eventos ?? [], versoes });
  }

  let q = admin.from("analises")
    .select("id, titulo, status, versao, enviada_em, updated_at, parceiro_nome, comentario_revisao, parceiro_id, client_id, case_id, atividade_id, client_profiles ( nome, empresa ), client_cases ( titulo )")
    .order("updated_at", { ascending: false }).limit(200);
  const st = sp.get("status"); if (st) q = q.eq("status", st);
  const pid = sp.get("parceiro_id"); if (pid) q = q.eq("parceiro_id", pid);
  const cid = sp.get("client_id"); if (cid) q = q.eq("client_id", cid);
  const { data, error } = await q;
  if (error) return NextResponse.json({ analises: [], aviso: hintV23(error.message) || undefined });
  return NextResponse.json({ analises: data ?? [] });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  acao: z.enum(["iniciar_revisao", "ajustes", "aprovar", "arquivar"]),
  comentario: z.string().max(2000).optional(),
});

/** Transições permitidas (de → ação). */
const PODE: Record<string, string[]> = {
  iniciar_revisao: ["enviada"],
  ajustes: ["enviada", "em_revisao"],
  aprovar: ["enviada", "em_revisao"],
  arquivar: ["aprovada", "ajustes_solicitados", "rascunho"],
};

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, acao, comentario } = parsed.data;

  if (acao === "ajustes" && !(comentario || "").trim()) {
    return NextResponse.json({ error: "Solicitar ajustes exige um comentário orientando a correção." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: atual } = await admin.from("analises").select("*").eq("id", id).maybeSingle();
  if (!atual) return NextResponse.json({ error: "Nao encontrada" }, { status: 404 });
  if (!PODE[acao].includes(atual.status)) {
    return NextResponse.json({ error: `Transição inválida: ${atual.status} não permite "${acao}".` }, { status: 409 });
  }

  const agora = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: agora };
  if (acao === "iniciar_revisao") updates.status = "em_revisao";
  if (acao === "ajustes") { updates.status = "ajustes_solicitados"; updates.comentario_revisao = comentario!.trim(); }
  if (acao === "aprovar") { updates.status = "aprovada"; updates.revisada_em = agora; updates.revisada_por = adminUser.nome; }
  if (acao === "arquivar") updates.status = "arquivada";

  // INTEGRIDADE DE VERSÕES: ao solicitar ajustes, congela um snapshot da versão
  // revisada (arquivada, encadeada via versao_anterior) ANTES de o colaborador
  // editar em cima — a revisão anterior permanece consultável, nunca sobrescrita.
  if (acao === "ajustes") {
    const a = atual as Record<string, unknown>;
    const { data: snap } = await admin.from("analises").insert({
      parceiro_id: a.parceiro_id, parceiro_nome: a.parceiro_nome,
      client_id: a.client_id, case_id: a.case_id, atividade_id: a.atividade_id,
      titulo: `${a.titulo} (versão ${a.versao ?? 1} — revisada)`,
      periodo_analisado: a.periodo_analisado, objetivo: a.objetivo, dados_utilizados: a.dados_utilizados,
      diagnostico: a.diagnostico, oportunidades: a.oportunidades, riscos: a.riscos,
      recomendacoes: a.recomendacoes, conclusao: a.conclusao,
      status: "arquivada", versao: a.versao ?? 1,
      versao_anterior: a.versao_anterior ?? null,
      enviada_em: a.enviada_em,
    }).select("id").single();
    if (snap?.id) updates.versao_anterior = snap.id;  // o registro vivo encadeia ao snapshot
  }

  // anti-corrida: só aplica se o status ainda for o lido (duas decisões simultâneas → uma ganha, outra 409)
  const { data: ok, error } = await admin.from("analises").update(updates).eq("id", id).eq("status", atual.status).select("id");
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  if (!ok || !ok.length) return NextResponse.json({ error: "A análise mudou de estado — recarregue antes de decidir." }, { status: 409 });

  // notificações internas idempotentes ao colaborador
  const pid = (atual as { parceiro_id?: string | null }).parceiro_id;
  if (pid && acao === "ajustes") {
    await notificar(admin, {
      destinatario_tipo: "parceiro", destinatario_id: pid, evento: "analise_ajustes",
      titulo: `Ajustes solicitados na análise "${(atual as { titulo?: string }).titulo}"`,
      referencia_tipo: "analise", referencia_id: id,
      dedup_key: `analise_ajustes:${id}:v${(atual as { versao?: number }).versao ?? 1}`,
    });
  }
  if (pid && acao === "aprovar") {
    await notificar(admin, {
      destinatario_tipo: "parceiro", destinatario_id: pid, evento: "analise_aprovada",
      titulo: `Análise aprovada: "${(atual as { titulo?: string }).titulo}"`,
      referencia_tipo: "analise", referencia_id: id,
      dedup_key: `analise_aprovada:${id}`,
    });
  }

  const EVENTO: Record<string, string> = { iniciar_revisao: "em_revisao", ajustes: "ajustes_solicitados", aprovar: "aprovada", arquivar: "arquivada" };
  await admin.from("analise_eventos").insert({
    analise_id: id, evento: EVENTO[acao], detalhe: comentario?.trim() || null, autor: adminUser.nome,
  }).then(() => {}, () => {});
  return NextResponse.json({ ok: true, status: updates.status });
}
