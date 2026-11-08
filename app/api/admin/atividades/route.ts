import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { derivarAlerta, sincronizarLedger } from "@/lib/atividades/alertas";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Admin · Atividades (tarefas das advogadas).
 * GET    ?parceiro_id=&client_id=&status=&atraso=1  → lista com responsável/cliente/caso + alerta derivado
 *        ?overview=1 → contadores (pendentes, em_andamento, concluidas, atrasadas, avisos)
 * POST   cria atividade
 * PATCH  edita / conclui (conclusão de atividade visível → vira atualização no portal do cliente)
 * DELETE ?id=
 */

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return Boolean(prof);
}

function hint(msg: string) {
  const m = (msg || "").toLowerCase();
  return (m.includes("does not exist") || m.includes("could not find") || m.includes("schema cache") || m.includes("relationship"))
    ? "Tabela de atividades não configurada — rode o SQL do atividades-v12 no Supabase."
    : null;
}

const SELECT =
  "id, titulo, descricao, prioridade, status, prazo, concluida_em, visivel_cliente, criado_por, created_at, updated_at, parceiro_id, client_id, case_id, parceiros_codigos ( nome ), client_profiles ( nome, empresa ), client_cases ( titulo )";

type Row = Record<string, unknown> & {
  status: string; prazo: string | null;
  parceiros_codigos?: { nome: string } | null;
  client_profiles?: { nome: string; empresa: string | null } | null;
  client_cases?: { titulo: string } | null;
};

function shape(r: Row) {
  return {
    ...r,
    responsavel_nome: r.parceiros_codigos?.nome ?? null,
    cliente_nome: r.client_profiles?.nome ?? null,
    cliente_empresa: r.client_profiles?.empresa ?? null,
    caso_titulo: r.client_cases?.titulo ?? null,
    alerta: derivarAlerta(r.status, r.prazo),
    parceiros_codigos: undefined, client_profiles: undefined, client_cases: undefined,
  };
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const admin = createAdminClient();

  // mantém o ledger em dia mesmo sem cron (idempotente, barato)
  void sincronizarLedger(admin).catch(() => {});

  let q = admin.from("atividades").select(SELECT).order("prazo", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  const parceiro = sp.get("parceiro_id");
  const client = sp.get("client_id");
  const status = sp.get("status");
  if (parceiro) q = q.eq("parceiro_id", parceiro);
  if (client) q = q.eq("client_id", client);
  if (status) q = q.eq("status", status);

  const { data, error } = await q.limit(1000);
  if (error) return NextResponse.json({ error: hint(error.message) || "Falha ao listar" }, { status: 500 });

  let atividades = ((data ?? []) as unknown as Row[]).map(shape);
  if (sp.get("atraso") === "1") atividades = atividades.filter((a) => a.alerta === "atraso");

  if (sp.get("overview") === "1") {
    const todas = atividades;
    return NextResponse.json({
      atividades,
      overview: {
        pendentes: todas.filter((a) => a.status === "pendente").length,
        em_andamento: todas.filter((a) => a.status === "em_andamento").length,
        concluidas: todas.filter((a) => a.status === "concluida").length,
        atrasadas: todas.filter((a) => a.alerta === "atraso").length,
        avisos: todas.filter((a) => a.alerta === "aviso_24h" || a.alerta === "aviso_48h").length,
      },
    });
  }
  return NextResponse.json({ atividades });
}

const postSchema = z.object({
  titulo: z.string().min(2).max(240),
  descricao: z.string().max(4000).optional().nullable(),
  parceiro_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid().optional().nullable(),
  prioridade: z.enum(["baixa", "media", "alta"]).optional(),
  prazo: z.string().optional().nullable(),
  visivel_cliente: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const prazoISO = parsed.data.prazo ? new Date(parsed.data.prazo) : null;
  if (parsed.data.prazo && (prazoISO === null || isNaN(prazoISO.getTime()))) {
    return NextResponse.json({ error: "Data/hora de prazo invalida" }, { status: 422 });
  }

  const admin = createAdminClient();
  const baseInsert = {
    titulo: parsed.data.titulo.trim(),
    descricao: parsed.data.descricao || null,
    parceiro_id: parsed.data.parceiro_id || null,
    client_id: parsed.data.client_id || null,
    case_id: parsed.data.case_id || null,
    prioridade: parsed.data.prioridade || "media",
    prazo: prazoISO ? prazoISO.toISOString() : null,
    visivel_cliente: !!parsed.data.visivel_cliente,
    criado_por: "admin",
  };
  // prazo_original imutável (pontualidade original); tolera ambiente pré-v24
  let { data, error } = await admin
    .from("atividades")
    .insert({ ...baseInsert, prazo_original: prazoISO ? prazoISO.toISOString() : null })
    .select("id")
    .single();
  if (error && /prazo_original|column|schema cache/i.test(error.message)) {
    const retry = await admin.from("atividades").insert(baseInsert).select("id").single();
    data = retry.data; error = retry.error;
  }
  if (error || !data) return NextResponse.json({ error: hint(error?.message || "") || "Falha ao criar" }, { status: 500 });

  await admin.from("atividade_historico").insert({ atividade_id: data.id, evento: "Atividade criada", autor: "admin" });
  if (parsed.data.parceiro_id) {
    await notificar(admin, {
      destinatario_tipo: "parceiro", destinatario_id: parsed.data.parceiro_id, evento: "tarefa_nova",
      titulo: `Nova tarefa: ${parsed.data.titulo.trim()}`,
      referencia_tipo: "atividade", referencia_id: data.id,
      dedup_key: `tarefa_nova:${data.id}`,
    });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().min(2).max(240).optional(),
  descricao: z.string().max(4000).optional().nullable(),
  parceiro_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  case_id: z.string().uuid().optional().nullable(),
  prioridade: z.enum(["baixa", "media", "alta"]).optional(),
  status: z.enum(["pendente", "em_andamento", "aguardando_revisao", "concluida", "cancelada"]).optional(),
  prazo: z.string().optional().nullable(),
  visivel_cliente: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, ...campos } = parsed.data;

  const admin = createAdminClient();
  const { data: atual } = await admin.from("atividades").select("status, titulo, case_id, visivel_cliente, publicado_portal, prazo").eq("id", id).maybeSingle();
  if (!atual) return NextResponse.json({ error: "Atividade nao encontrada" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (campos.titulo !== undefined) updates.titulo = campos.titulo.trim();
  if (campos.descricao !== undefined) updates.descricao = campos.descricao || null;
  if (campos.parceiro_id !== undefined) updates.parceiro_id = campos.parceiro_id || null;
  if (campos.client_id !== undefined) updates.client_id = campos.client_id || null;
  if (campos.case_id !== undefined) updates.case_id = campos.case_id || null;
  if (campos.prioridade !== undefined) updates.prioridade = campos.prioridade;
  if (campos.visivel_cliente !== undefined) updates.visivel_cliente = campos.visivel_cliente;
  if (campos.prazo !== undefined) {
    if (campos.prazo === null || campos.prazo === "") updates.prazo = null;
    else {
      const d = new Date(campos.prazo);
      if (isNaN(d.getTime())) return NextResponse.json({ error: "Prazo invalido" }, { status: 422 });
      updates.prazo = d.toISOString();
    }
  }

  const concluindoAgora = campos.status === "concluida" && atual.status !== "concluida";
  if (campos.status !== undefined) {
    updates.status = campos.status;
    updates.concluida_em = campos.status === "concluida" ? new Date().toISOString() : null;
  }

  const { error } = await admin.from("atividades").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });

  // histórico com valores de→para (preserva a linha do tempo dos prazos)
  const fmtH = (iso: unknown) => (iso ? new Date(String(iso)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "sem prazo");
  const eventos: string[] = [];
  if (campos.status) eventos.push(`Status: ${atual.status} → ${campos.status}`);
  if (campos.prazo !== undefined) eventos.push(`Prazo: ${fmtH((atual as { prazo?: string }).prazo)} → ${fmtH(updates.prazo)}`);
  if (campos.parceiro_id !== undefined) eventos.push("Responsável alterado");
  if (eventos.length) {
    await admin.from("atividade_historico").insert(eventos.map((evento) => ({ atividade_id: id, evento, autor: "admin" })));
  }

  // prazo alterado → aviso interno ao responsável (idempotente por novo prazo)
  if (campos.prazo !== undefined) {
    const { data: resp } = await admin.from("atividades").select("parceiro_id, titulo").eq("id", id).maybeSingle();
    if (resp?.parceiro_id) {
      await notificar(admin, {
        destinatario_tipo: "parceiro", destinatario_id: resp.parceiro_id, evento: "tarefa_prazo",
        titulo: `Prazo alterado: ${resp.titulo}`,
        referencia_tipo: "atividade", referencia_id: id,
        dedup_key: `tarefa_prazo:${id}:${String(updates.prazo ?? "sem")}`,
      });
    }
  }

  // conclusão visível → atualização no portal do cliente (publica NO MÁXIMO uma vez)
  const caseId = (updates.case_id as string | undefined) ?? atual.case_id;
  const visivel = (updates.visivel_cliente as boolean | undefined) ?? atual.visivel_cliente;
  const jaPublicada = (atual as { publicado_portal?: boolean }).publicado_portal === true;
  if (concluindoAgora && visivel && caseId && !jaPublicada) {
    const { error: pubErr } = await admin.from("case_updates").insert({
      case_id: caseId,
      titulo: (updates.titulo as string) || atual.titulo,
      corpo: "Etapa concluída pela equipe Arché.",
      tipo: "marco",
    });
    // marca como publicada só se a inserção no portal funcionou (evita duplicar numa reabertura/reconclusão)
    if (!pubErr) await admin.from("atividades").update({ publicado_portal: true }).eq("id", id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
  const admin = createAdminClient();
  const { error } = await admin.from("atividades").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
