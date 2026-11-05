import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const TERMOS_VERSAO = "termos-aprovacao-2026-11";

const schema = z.object({
  id: z.string().uuid(),
  decisao: z.enum(["aprovada", "recusada", "ajuste"]),
  resposta: z.string().max(2000).optional(),      // comentário livre
  termos_aceito: z.boolean().optional(),          // obrigatório ao aprovar
  motivo: z.string().max(400).optional(),         // obrigatório ao solicitar ajuste
});

function gerarProtocolo(): string {
  const ano = new Date().getFullYear();
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `ARQ-${ano}-${rand}`;
}

/** POST — o cliente decide uma aprovação pendente (aprovar / recusar / solicitar ajuste). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, decisao } = parsed.data;

  const admin = createAdminClient();
  // trava: só a aprovação DO cliente logado
  const { data: apr } = await admin
    .from("client_aprovacoes")
    .select("id, client_id, case_id, titulo, status, prazo_decisao")
    .eq("id", id)
    .maybeSingle();
  if (!apr || apr.client_id !== u.user.id) return NextResponse.json({ error: "Aprovação não encontrada" }, { status: 404 });
  if (apr.status !== "pendente") return NextResponse.json({ error: "Esta solicitação já foi respondida." }, { status: 409 });

  // nome do cliente (para registrar quem decidiu)
  const { data: perfil } = await admin.from("client_profiles").select("nome").eq("user_id", u.user.id).maybeSingle();
  const nomeCliente = perfil?.nome || "Cliente";

  // ---- SOLICITAR AJUSTE ----
  if (decisao === "ajuste") {
    const motivo = (parsed.data.motivo || "").trim();
    if (motivo.length < 3) return NextResponse.json({ error: "Descreva o motivo do ajuste." }, { status: 422 });
    const { error } = await admin.from("client_aprovacoes").update({
      status: "ajuste_solicitado",
      ajuste_motivo: motivo,
      ajuste_obs: parsed.data.resposta?.trim() || null,
      ajuste_solicitado_em: new Date().toISOString(),
    }).eq("id", id).eq("status", "pendente");        // guarda anti-corrida
    if (error) return NextResponse.json({ error: "Falha ao registrar" }, { status: 500 });
    await admin.from("aprovacao_eventos").insert({ aprovacao_id: id, evento: "ajuste_solicitado", detalhe: motivo, autor: nomeCliente }).then(() => {}, () => {});
    return NextResponse.json({ ok: true, status: "ajuste_solicitado" });
  }

  // ---- RECUSAR ----
  if (decisao === "recusada") {
    const { error } = await admin.from("client_aprovacoes").update({
      status: "recusada",
      resposta: parsed.data.resposta?.trim() || null,
      respondido_em: new Date().toISOString(),
      decidido_por_nome: nomeCliente,
    }).eq("id", id).eq("status", "pendente");
    if (error) return NextResponse.json({ error: "Falha ao registrar" }, { status: 500 });
    await admin.from("aprovacao_eventos").insert({ aprovacao_id: id, evento: "decidida", detalhe: "recusada", autor: nomeCliente }).then(() => {}, () => {});
    return NextResponse.json({ ok: true, status: "recusada" });
  }

  // ---- APROVAR (exige ciência dos termos) ----
  if (!parsed.data.termos_aceito) {
    return NextResponse.json({ error: "É necessário confirmar a leitura e concordância com os termos." }, { status: 422 });
  }

  const agora = new Date().toISOString();
  // gera protocolo único (retry em colisão rara)
  let protocolo = gerarProtocolo();
  let ok = false;
  for (let i = 0; i < 3 && !ok; i++) {
    const { error } = await admin.from("client_aprovacoes").update({
      status: "aprovada",
      resposta: parsed.data.resposta?.trim() || null,
      respondido_em: agora,
      decidido_por_nome: nomeCliente,
      termos_versao: TERMOS_VERSAO,
      termos_aceitos_em: agora,
      protocolo,
    }).eq("id", id).eq("status", "pendente");        // idempotência: só muda se ainda pendente
    if (!error) { ok = true; break; }
    if (/duplicate|unique|protocolo/i.test(error.message)) { protocolo = gerarProtocolo(); continue; }
    return NextResponse.json({ error: "Falha ao registrar" }, { status: 500 });
  }
  if (!ok) return NextResponse.json({ error: "Não foi possível gerar o protocolo. Tente novamente." }, { status: 500 });

  await admin.from("aprovacao_eventos").insert({ aprovacao_id: id, evento: "decidida", detalhe: `aprovada · protocolo ${protocolo}`, autor: nomeCliente }).then(() => {}, () => {});
  // reflete na timeline do caso (uma única entrada)
  if (apr.case_id) {
    await admin.from("case_updates").insert({
      case_id: apr.case_id,
      titulo: "Aprovação registrada",
      corpo: `Você autorizou: ${apr.titulo}. Protocolo ${protocolo}.`,
      tipo: "marco",
    }).then(() => {}, () => {});
  }
  return NextResponse.json({ ok: true, status: "aprovada", protocolo, decidido_em: agora, decidido_por: nomeCliente });
}
