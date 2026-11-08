import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { derivarAlerta } from "@/lib/atividades/alertas";

export const runtime = "nodejs";

/**
 * Central de Comando · Colaboradores.
 * GET              → visão consolidada: stats reais por colaborador + agenda de prazos.
 * GET ?perfil=<id> → perfil operacional: tarefas, histórico consolidado e indicadores.
 * Fonte canônica de prazos: `atividades` (v12). Sem números fictícios: tudo é contado
 * do banco; quando não há dado, o campo vem null ("Dados insuficientes" na UI).
 */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return prof ? u.user : null;
}

type Ativ = {
  id: string; titulo: string; status: string; prazo: string | null; prioridade: string;
  concluida_em: string | null; created_at: string; parceiro_id: string | null;
  client_id: string | null; case_id: string | null;
};

function statsDe(atividades: Ativ[]) {
  const abertas = atividades.filter((a) => a.status === "pendente" || a.status === "em_andamento" || a.status === "aguardando_revisao");
  const concluidas = atividades.filter((a) => a.status === "concluida");
  const atrasadas = abertas.filter((a) => derivarAlerta(a.status === "aguardando_revisao" ? "pendente" : a.status, a.prazo) === "atraso");
  const comPrazo = abertas.filter((a) => a.prazo).sort((x, y) => new Date(x.prazo!).getTime() - new Date(y.prazo!).getTime());
  const noPrazo = concluidas.filter((a) => a.prazo && a.concluida_em && new Date(a.concluida_em) <= new Date(a.prazo));
  const foraPrazo = concluidas.filter((a) => a.prazo && a.concluida_em && new Date(a.concluida_em) > new Date(a.prazo));
  // tempo médio de conclusão (dias) — só quando mensurável
  const comTempos = concluidas.filter((a) => a.concluida_em);
  const tempoMedioDias = comTempos.length
    ? Math.round(comTempos.reduce((s, a) => s + (new Date(a.concluida_em!).getTime() - new Date(a.created_at).getTime()), 0) / comTempos.length / 86400000 * 10) / 10
    : null;
  return {
    total: atividades.length,
    pendentes: atividades.filter((a) => a.status === "pendente").length,
    em_andamento: atividades.filter((a) => a.status === "em_andamento").length,
    aguardando_revisao: atividades.filter((a) => a.status === "aguardando_revisao").length,
    concluidas: concluidas.length,
    canceladas: atividades.filter((a) => a.status === "cancelada").length,
    atrasadas: atrasadas.length,
    urgentes_abertas: abertas.filter((a) => a.prioridade === "alta").length,
    proximo_prazo: comPrazo[0]?.prazo ?? null,
    proximo_prazo_titulo: comPrazo[0]?.titulo ?? null,
    no_prazo: noPrazo.length,
    fora_prazo: foraPrazo.length,
    tempo_medio_dias: tempoMedioDias,
  };
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();
  const sp = new URL(req.url).searchParams;
  const perfilId = sp.get("perfil");

  // ---------- PERFIL EXPANDIDO ----------
  if (perfilId) {
    if (!/^[0-9a-f-]{36}$/i.test(perfilId)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
    const [{ data: colab }, { data: ativs }] = await Promise.all([
      admin.from("parceiros_codigos").select("id, codigo, nome, observacoes, ativo, criado_em, ultimo_acesso, papel").eq("id", perfilId).maybeSingle(),
      admin.from("atividades")
        .select("id, titulo, status, prazo, prioridade, concluida_em, created_at, parceiro_id, client_id, case_id, client_profiles ( nome ), client_cases ( titulo )")
        .eq("parceiro_id", perfilId)
        .order("prazo", { ascending: true, nullsFirst: false })
        .limit(300),
    ]);
    if (!colab) return NextResponse.json({ error: "Colaborador nao encontrado" }, { status: 404 });

    const lista = ((ativs ?? []) as unknown as (Ativ & { client_profiles?: { nome: string } | null; client_cases?: { titulo: string } | null })[]);
    const tarefas = lista.map((a) => ({
      id: a.id, titulo: a.titulo, status: a.status, prazo: a.prazo, prioridade: a.prioridade,
      concluida_em: a.concluida_em,
      cliente: a.client_profiles?.nome ?? null,
      caso: a.client_cases?.titulo ?? null,
      alerta: derivarAlerta(a.status === "aguardando_revisao" ? "pendente" : a.status, a.prazo),
    }));

    // histórico consolidado: atividade_historico das atividades dele (eventos reais, sem duplicar fontes)
    const ids = lista.map((a) => a.id);
    let historico: { evento: string; autor: string | null; created_at: string; atividade: string }[] = [];
    if (ids.length) {
      const { data: hist } = await admin.from("atividade_historico")
        .select("atividade_id, evento, autor, created_at")
        .in("atividade_id", ids)
        .order("created_at", { ascending: false })
        .limit(80);
      const porId = new Map(lista.map((a) => [a.id, a.titulo]));
      historico = (hist ?? []).map((h) => ({ evento: h.evento, autor: h.autor, created_at: h.created_at, atividade: porId.get(h.atividade_id) ?? "—" }));
    }

    // casos vinculados (via atividades)
    const casosSet = new Map<string, string>();
    for (const a of lista) if (a.case_id && (a as { client_cases?: { titulo: string } | null }).client_cases?.titulo) casosSet.set(a.case_id, (a as { client_cases?: { titulo: string } | null }).client_cases!.titulo);

    return NextResponse.json({
      colaborador: colab,
      stats: statsDe(lista),
      tarefas,
      historico,
      casos: [...casosSet].map(([id, titulo]) => ({ id, titulo })),
    });
  }

  // ---------- VISÃO CONSOLIDADA ----------
  const [{ data: colabs }, { data: ativs }] = await Promise.all([
    admin.from("parceiros_codigos").select("id, codigo, nome, observacoes, ativo, ultimo_acesso, papel").order("nome"),
    admin.from("atividades").select("id, titulo, status, prazo, prioridade, concluida_em, created_at, parceiro_id, client_id, case_id").limit(2000),
  ]);
  const todas = (ativs ?? []) as Ativ[];
  const porColab = new Map<string, Ativ[]>();
  for (const a of todas) {
    if (!a.parceiro_id) continue;
    (porColab.get(a.parceiro_id) ?? porColab.set(a.parceiro_id, []).get(a.parceiro_id)!).push(a);
  }

  const colaboradores = (colabs ?? []).map((c) => ({ ...c, stats: statsDe(porColab.get(c.id) ?? []) }));

  // agenda: hoje / 7 dias / atrasadas (todas as atividades abertas com prazo)
  const agora = Date.now();
  const abertas = todas.filter((a) => (a.status === "pendente" || a.status === "em_andamento" || a.status === "aguardando_revisao") && a.prazo);
  const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
  const seteDias = agora + 7 * 86400000;
  const nomePor = new Map((colabs ?? []).map((c) => [c.id, c.nome]));
  const item = (a: Ativ) => ({ id: a.id, titulo: a.titulo, prazo: a.prazo, prioridade: a.prioridade, status: a.status, responsavel: a.parceiro_id ? (nomePor.get(a.parceiro_id) ?? "—") : "sem responsável" });
  const agenda = {
    atrasadas: abertas.filter((a) => new Date(a.prazo!).getTime() < agora).map(item),
    hoje: abertas.filter((a) => { const t = new Date(a.prazo!).getTime(); return t >= agora && t <= fimHoje.getTime(); }).map(item),
    semana: abertas.filter((a) => { const t = new Date(a.prazo!).getTime(); return t > fimHoje.getTime() && t <= seteDias; }).map(item),
  };

  return NextResponse.json({
    colaboradores,
    agenda,
    overview: {
      total_colaboradores: (colabs ?? []).length,
      abertas: todas.filter((a) => a.status === "pendente" || a.status === "em_andamento" || a.status === "aguardando_revisao").length,
      aguardando_revisao: todas.filter((a) => a.status === "aguardando_revisao").length,
      atrasadas: agenda.atrasadas.length,
      prazos_7d: agenda.hoje.length + agenda.semana.length,
      concluidas_30d: todas.filter((a) => a.status === "concluida" && a.concluida_em && Date.now() - new Date(a.concluida_em).getTime() <= 30 * 86400000).length,
    },
  });
}
