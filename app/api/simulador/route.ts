import { NextResponse } from "next/server";
import { simuladorSchema, calcularPotencial } from "@/lib/validation/simulador";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp, hashIp } from "@/lib/hash";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Rate limit
  const ip = getRequestIp(req);
  const ipHash = hashIp(ip);
  const { success } = await checkRateLimit(`simul:${ipHash || "anon"}`);
  if (!success) {
    return NextResponse.json({ error: "Aguarde um momento." }, { status: 429 });
  }

  // Parse + Zod
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = simuladorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // Revalida o cálculo server-side (anti-tampering) — se o client mandou
  // valores que não batem com a fórmula, recalcula e usa os corretos.
  const recalc = calcularPotencial({
    faturamento: data.faturamento,
    despesa_indireta: data.despesa_indireta,
    setor: data.setor,
    regime: data.regime,
  });

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("[api/simulador] Supabase não configurado:", e);
    return NextResponse.json(
      { error: "Servidor de armazenamento não configurado." },
      { status: 503 },
    );
  }

  const { data: row, error } = await supabase
    .from("simulator_runs")
    .insert({
      faturamento: data.faturamento,
      despesa_indireta: data.despesa_indireta,
      setor: data.setor,
      regime: data.regime,
      tese_judicial: recalc.tese_judicial,
      tese_administrativa: recalc.tese_administrativa,
      icms_comercio: recalc.icms_comercio,
      total: recalc.total,
      user_agent: req.headers.get("user-agent")?.slice(0, 400) || null,
      ip_hash: ipHash,
      referrer: req.headers.get("referer")?.slice(0, 400) || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api/simulador] insert error:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar a simulação." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, id: row.id, total: recalc.total },
    { status: 201 },
  );
}
