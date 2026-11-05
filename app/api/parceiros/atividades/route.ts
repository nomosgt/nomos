import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { derivarAlerta } from "@/lib/atividades/alertas";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Central da Advogada · Atividades próprias.
 * GET   → atividades atribuídas ao colaborador logado (com alerta derivado)
 * PATCH { id, status } → atualiza o status da própria atividade
 *   (conclusão de atividade visível → vira atualização no portal do cliente)
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

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data, error } = await ctx.admin
    .from("atividades")
    .select("id, titulo, descricao, prioridade, status, prazo, concluida_em, client_id, case_id, client_profiles ( nome, empresa ), client_cases ( titulo )")
    .eq("parceiro_id", ctx.parceiro.id)
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error && error.message.includes("does not exist")) {
    return NextResponse.json({ atividades: [] });
  }
  const atividades = (data ?? []).map((r) => {
    const cp = r.client_profiles as unknown as { nome: string; empresa: string | null } | null;
    const cc = r.client_cases as unknown as { titulo: string } | null;
    return {
      id: r.id, titulo: r.titulo, descricao: r.descricao, prioridade: r.prioridade,
      status: r.status, prazo: r.prazo, concluida_em: r.concluida_em,
      cliente_nome: cp?.nome ?? null, cliente_empresa: cp?.empresa ?? null, caso_titulo: cc?.titulo ?? null,
      alerta: derivarAlerta(r.status as string, r.prazo as string),
    };
  });
  return NextResponse.json({ atividades });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pendente", "em_andamento", "concluida"]),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  // a atividade precisa ser deste colaborador
  const { data: ativ } = await ctx.admin
    .from("atividades")
    .select("id, status, titulo, case_id, visivel_cliente, parceiro_id, publicado_portal")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!ativ || ativ.parceiro_id !== ctx.parceiro.id) {
    return NextResponse.json({ error: "Atividade nao encontrada" }, { status: 404 });
  }

  const concluindoAgora = parsed.data.status === "concluida" && ativ.status !== "concluida";
  const { error } = await ctx.admin
    .from("atividades")
    .update({
      status: parsed.data.status,
      concluida_em: parsed.data.status === "concluida" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });

  await ctx.admin.from("atividade_historico").insert({
    atividade_id: parsed.data.id,
    evento: `Status → ${parsed.data.status}`,
    autor: ctx.parceiro.nome,
  });

  const jaPublicada = (ativ as { publicado_portal?: boolean }).publicado_portal === true;
  if (concluindoAgora && ativ.visivel_cliente && ativ.case_id && !jaPublicada) {
    const { error: pubErr } = await ctx.admin.from("case_updates").insert({
      case_id: ativ.case_id,
      titulo: ativ.titulo,
      corpo: "Etapa concluída pela equipe Arché.",
      tipo: "marco",
    });
    if (!pubErr) await ctx.admin.from("atividades").update({ publicado_portal: true }).eq("id", parsed.data.id);
  }

  return NextResponse.json({ ok: true });
}
