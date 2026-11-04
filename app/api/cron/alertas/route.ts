import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sincronizarLedger } from "@/lib/atividades/alertas";

export const runtime = "nodejs";

/**
 * Cron de alertas — roda de hora em hora (Vercel Cron, ver vercel.json).
 * Reconhece atrasos e avisos 24/48h SEM ninguém abrir a página.
 * Idempotente e sem duplicar (dedup no ledger atividade_alertas).
 *
 * Segurança: se CRON_SECRET estiver definido, exige
 * Authorization: Bearer <CRON_SECRET> (o Vercel Cron envia isso
 * automaticamente quando a env existe). Sem a env, aceita apenas
 * chamadas internas do Vercel (header x-vercel-cron).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
  } else if (!isVercelCron) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase indisponivel" }, { status: 503 });

  const admin = createAdminClient();
  try {
    const r = await sincronizarLedger(admin);
    return NextResponse.json({ ok: true, ...r, em: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "falha" }, { status: 500 });
  }
}
