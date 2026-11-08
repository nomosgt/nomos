import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { derivarAlerta } from "@/lib/atividades/alertas";

export const runtime = "nodejs";

/**
 * Inteligência Empresarial · visão consolidada das empresas.
 * Agrega por cliente: cadastro, último faturamento informado (com origem e
 * validação — NUNCA somando períodos/tipos distintos), casos ativos, análises
 * pendentes, deadlines críticos e última atualização. Ausência de dado = null
 * ("Sem dados" na UI), nunca zero fictício. Domínio separado da recuperação
 * tributária.
 */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return Boolean(prof);
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ empresas: [] });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();
  const [cli, casos, ativs, analises, dados] = await Promise.all([
    admin.from("client_profiles").select("user_id, nome, empresa, nome_fantasia, setor, regime_tributario, consultor, status, updated_at").order("empresa"),
    admin.from("client_cases").select("id, client_id, status"),
    admin.from("atividades").select("id, client_id, status, prazo"),
    admin.from("analises").select("id, client_id, status").then((r) => r, () => ({ data: null })),
    admin.from("empresa_dados").select("client_id, tipo, periodo, valor, origem, validado, created_at").order("created_at", { ascending: false }).then((r) => r, () => ({ data: null })),
  ]);

  const casosPor = new Map<string, { ativos: number }>();
  for (const c of casos.data ?? []) {
    const e = casosPor.get(c.client_id) ?? { ativos: 0 };
    if (c.status === "em_andamento") e.ativos++;
    casosPor.set(c.client_id, e);
  }

  const prazosPor = new Map<string, { atrasadas: number; proximos7d: number }>();
  const agora = Date.now();
  for (const a of ativs.data ?? []) {
    if (!a.client_id || !a.prazo) continue;
    const aberto = a.status === "pendente" || a.status === "em_andamento" || a.status === "aguardando_revisao";
    if (!aberto) continue;
    const e = prazosPor.get(a.client_id) ?? { atrasadas: 0, proximos7d: 0 };
    if (derivarAlerta("pendente", a.prazo) === "atraso") e.atrasadas++;
    else if (new Date(a.prazo).getTime() - agora <= 7 * 86400000) e.proximos7d++;
    prazosPor.set(a.client_id, e);
  }

  const analisesPor = new Map<string, { pendentes: number; aprovadas: number }>();
  for (const an of (analises.data ?? []) as { client_id: string | null; status: string }[]) {
    if (!an.client_id) continue;
    const e = analisesPor.get(an.client_id) ?? { pendentes: 0, aprovadas: 0 };
    if (an.status === "enviada" || an.status === "em_revisao") e.pendentes++;
    if (an.status === "aprovada") e.aprovadas++;
    analisesPor.set(an.client_id, e);
  }

  // faturamento: registro MAIS RECENTE de faturamento_mensal/anual por cliente (sem agregar períodos)
  const fatPor = new Map<string, { tipo: string; periodo: string; valor: number; origem: string; validado: boolean }>();
  const dadosValidarPor = new Map<string, number>();
  for (const d of (dados.data ?? []) as { client_id: string; tipo: string; periodo: string; valor: number | string; origem: string; validado: boolean }[]) {
    if ((d.tipo === "faturamento_mensal" || d.tipo === "faturamento_anual") && !fatPor.has(d.client_id)) {
      fatPor.set(d.client_id, { tipo: d.tipo, periodo: d.periodo, valor: Number(d.valor), origem: d.origem, validado: d.validado });
    }
    if (!d.validado) dadosValidarPor.set(d.client_id, (dadosValidarPor.get(d.client_id) ?? 0) + 1);
  }

  const empresas = (cli.data ?? []).map((c) => ({
    user_id: c.user_id,
    empresa: c.empresa || c.nome,
    nome_fantasia: (c as { nome_fantasia?: string | null }).nome_fantasia ?? null,
    setor: (c as { setor?: string | null }).setor ?? null,
    regime: (c as { regime_tributario?: string | null }).regime_tributario ?? null,
    consultor: (c as { consultor?: string | null }).consultor ?? null,
    status: c.status,
    casos_ativos: casosPor.get(c.user_id)?.ativos ?? 0,
    prazos: prazosPor.get(c.user_id) ?? { atrasadas: 0, proximos7d: 0 },
    analises: analisesPor.get(c.user_id) ?? { pendentes: 0, aprovadas: 0 },
    faturamento: fatPor.get(c.user_id) ?? null,            // null = sem dados (nunca zero fictício)
    dados_aguardando_validacao: dadosValidarPor.get(c.user_id) ?? 0,
    atualizado_em: c.updated_at,
  }));

  return NextResponse.json({ empresas });
}
