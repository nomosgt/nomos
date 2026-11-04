import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Motor de alertas de atividades — lógica pura + sincronização do ledger.
 * O estado do alerta é DERIVADO do prazo/status (sempre correto na UI).
 * O ledger (atividade_alertas) registra o que o sistema já reconheceu,
 * inclusive pelo cron (sem ninguém abrir a página) e sem duplicar.
 */

export type AlertaTipo = "atraso" | "aviso_24h" | "aviso_48h" | null;

export const ALERTA_LABEL: Record<string, string> = {
  atraso: "Atrasada",
  aviso_24h: "Vence em 24h",
  aviso_48h: "Vence em 48h",
};

/** Deriva o alerta aplicável a partir do status e prazo. */
export function derivarAlerta(
  status: string,
  prazoISO: string | null | undefined,
  agora: Date = new Date(),
): AlertaTipo {
  if (!prazoISO || status === "concluida") return null;
  const prazo = new Date(prazoISO);
  if (isNaN(prazo.getTime())) return null;
  const ms = prazo.getTime() - agora.getTime();
  if (ms < 0) return "atraso";
  const h = ms / 3_600_000;
  if (h <= 24) return "aviso_24h";
  if (h <= 48) return "aviso_48h";
  return null;
}

/** true quando a atividade está vencida e não concluída. */
export function estaAtrasada(status: string, prazoISO: string | null | undefined, agora: Date = new Date()): boolean {
  return derivarAlerta(status, prazoISO, agora) === "atraso";
}

/**
 * Sincroniza o ledger de alertas (chamado pelo cron e, oportunisticamente,
 * ao carregar o painel). Insere o alerta atual de cada atividade (dedup por
 * atividade+tipo) e marca como resolvido o que não se aplica mais.
 */
export async function sincronizarLedger(admin: SupabaseClient): Promise<{ ativos: number; resolvidos: number }> {
  const { data, error } = await admin
    .from("atividades")
    .select("id, status, prazo")
    .not("prazo", "is", null);
  if (error || !data) return { ativos: 0, resolvidos: 0 };

  const agora = new Date();
  const ativos: { atividade_id: string; tipo: string; resolvido: boolean }[] = [];
  const semAlerta: string[] = []; // atividades cujo alerta deixou de valer

  for (const a of data) {
    const tipo = derivarAlerta(a.status as string, a.prazo as string, agora);
    if (tipo) ativos.push({ atividade_id: a.id as string, tipo, resolvido: false });
    else semAlerta.push(a.id as string);
  }

  if (ativos.length) {
    await admin
      .from("atividade_alertas")
      .upsert(ativos, { onConflict: "atividade_id,tipo", ignoreDuplicates: true });
  }

  let resolvidos = 0;
  if (semAlerta.length) {
    const { data: upd } = await admin
      .from("atividade_alertas")
      .update({ resolvido: true, resolvido_em: agora.toISOString() })
      .in("atividade_id", semAlerta)
      .eq("resolvido", false)
      .select("id");
    resolvidos = upd?.length ?? 0;
  }

  return { ativos: ativos.length, resolvidos };
}
