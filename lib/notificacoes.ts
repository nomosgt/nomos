import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notificação interna persistida e IDEMPOTENTE: o dedup_key único garante que
 * o mesmo evento de origem nunca gera dois avisos. Best-effort e tolerante:
 * se a tabela (v25) não existir, a operação principal segue sem quebrar.
 * Nunca simula push/e-mail — é registro interno lido pelas centrais.
 */
export async function notificar(
  admin: ReturnType<typeof createAdminClient>,
  n: {
    destinatario_tipo: "admin" | "parceiro";
    destinatario_id?: string | null;
    evento: string;
    titulo: string;
    referencia_tipo?: string;
    referencia_id?: string | null;
    dedup_key: string;
  },
): Promise<void> {
  try {
    await admin.from("notificacoes").upsert(
      {
        destinatario_tipo: n.destinatario_tipo,
        destinatario_id: n.destinatario_id ?? null,
        evento: n.evento,
        titulo: n.titulo.slice(0, 240),
        referencia_tipo: n.referencia_tipo ?? null,
        referencia_id: n.referencia_id ?? null,
        dedup_key: n.dedup_key.slice(0, 200),
      },
      { onConflict: "dedup_key", ignoreDuplicates: true },
    );
  } catch {
    /* v25 ausente — segue sem notificar */
  }
}
