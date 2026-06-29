/**
 * Captura de lead disparada apos a simulacao (antes de ver o resultado).
 * Salva no Supabase tabela `contatos` com origem='simulador'.
 *
 * Body esperado:
 * { email, telefone, faturamento?, setor?, regime?, total?, cnpj?, razao_social? }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp, hashIp } from "@/lib/hash";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("Email invalido"),
  telefone: z.string().min(8, "Telefone invalido").max(30),
  // Contexto da simulacao (opcional)
  cnpj: z.string().optional().nullable(),
  razao_social: z.string().optional().nullable(),
  faturamento: z.number().optional().nullable(),
  despesa_indireta: z.number().optional().nullable(),
  setor: z.string().optional().nullable(),
  regime: z.string().optional().nullable(),
  total: z.number().optional().nullable(),
});

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const ipHash = hashIp(ip);
  const { success } = await checkRateLimit(`lead:${ipHash || "anon"}`);
  if (!success) {
    return NextResponse.json(
      { error: "Muitos envios. Aguarde um minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        error:
          fe.email?.[0] || fe.telefone?.[0] || "Verifique os campos obrigatorios.",
        issues: fe,
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  if (!isSupabaseConfigured()) {
    // Sem Supabase: aceita o lead mas avisa que nao persistiu
    return NextResponse.json(
      { ok: true, persisted: false, note: "Supabase nao configurado." },
      { status: 200 },
    );
  }

  try {
    const supabase = createAdminClient();
    const mensagem = [
      data.razao_social ? `Empresa: ${data.razao_social}` : null,
      data.cnpj ? `CNPJ: ${data.cnpj}` : null,
      data.faturamento != null
        ? `Faturamento: R$ ${data.faturamento.toLocaleString("pt-BR")}`
        : null,
      data.despesa_indireta != null
        ? `Despesa indireta: R$ ${data.despesa_indireta.toLocaleString("pt-BR")}`
        : null,
      data.setor ? `Setor: ${data.setor}` : null,
      data.regime ? `Regime: ${data.regime}` : null,
      data.total != null
        ? `Estimativa: R$ ${data.total.toLocaleString("pt-BR")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    await supabase.from("contatos").insert({
      nome: data.razao_social || "Lead simulador",
      email: data.email,
      telefone: data.telefone,
      empresa: data.razao_social || null,
      mensagem: mensagem || "Lead capturado via simulador (sem detalhes adicionais).",
      origem: "simulador",
      status: "novo",
      ip_hash: ipHash,
    });
  } catch (e) {
    // Persist falhou — ainda retorna OK pra UI nao bloquear o usuario
    console.warn("[lead-simulador] persist err:", e);
    return NextResponse.json(
      { ok: true, persisted: false, error_internal: String(e) },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, persisted: true }, { status: 200 });
}
