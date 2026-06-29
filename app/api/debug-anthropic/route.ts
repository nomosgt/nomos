/**
 * Endpoint de DIAGNÓSTICO da chave Anthropic.
 * Acesse: https://nomos.gt/api/debug-anthropic
 *
 * Retorna JSON com:
 * - Chave presente?
 * - Formato OK?
 * - Modelo configurado
 * - Resposta real do Claude (com erro literal se falhar)
 *
 * REMOVER ESSE ENDPOINT EM PRODUCAO ESTAVEL.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const diag: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env_vars_visible: {
      ANTHROPIC_API_KEY_present: !!apiKey,
      ANTHROPIC_API_KEY_length: apiKey?.length || 0,
      ANTHROPIC_API_KEY_prefix: apiKey ? apiKey.slice(0, 12) + "..." : null,
      ANTHROPIC_API_KEY_starts_with_sk_ant: apiKey?.startsWith("sk-ant-") || false,
      ANTHROPIC_MODEL_env: process.env.ANTHROPIC_MODEL || "(usando default)",
      model_in_use: model,
      VERCEL_ENV: process.env.VERCEL_ENV || "(none)",
      NODE_ENV: process.env.NODE_ENV,
    },
  };

  if (!apiKey) {
    diag.veredict = "FALHA: ANTHROPIC_API_KEY nao esta presente nas env vars.";
    diag.next_step =
      "Vai no Vercel > Settings > Environment Variables > adicionar ANTHROPIC_API_KEY (Production+Preview+Development) > Redeploy.";
    return NextResponse.json(diag, { status: 200 });
  }

  // Tenta uma chamada real super simples
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: "Diga apenas 'OK' em portugues, nada mais.",
          },
        ],
      }),
    });

    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // resposta nao-JSON
    }

    diag.anthropic_response = {
      http_status: res.status,
      http_ok: res.ok,
      body: parsed ?? text.slice(0, 1500),
    };

    if (res.ok) {
      diag.veredict =
        "✅ SUCESSO: a chave Anthropic esta funcionando e o modelo respondeu.";
      diag.next_step =
        "Tudo certo. A analise IA do CNPJ deve estar funcionando. Se nao estiver, manda print do erro real (que agora aparece visivel na tela do /cnpj).";
    } else {
      let hint = "Verifica o erro acima e age conforme:";
      if (res.status === 401) {
        hint =
          "401 = chave invalida ou revogada. Gera uma nova em console.anthropic.com/settings/keys e cola no Vercel.";
      } else if (res.status === 400) {
        const errMsg = JSON.stringify(parsed).toLowerCase();
        if (errMsg.includes("credit") || errMsg.includes("balance")) {
          hint =
            "400 credit_balance: sem credito. Adiciona credito em console.anthropic.com/billing (minimo $5).";
        } else if (errMsg.includes("model")) {
          hint =
            "400 model error: o modelo '" +
            model +
            "' nao esta disponivel pra essa chave. Tenta setar ANTHROPIC_MODEL=claude-haiku-4-5-20251001 ou claude-3-5-haiku-20241022 no Vercel.";
        }
      } else if (res.status === 429) {
        hint = "429 rate limit: espera 1 minuto e tenta de novo.";
      } else if (res.status === 404) {
        hint =
          "404 model not found: o modelo '" +
          model +
          "' nao existe ou nao esta acessivel pra essa chave. Verifica em console.anthropic.com/models.";
      }
      diag.veredict = `❌ FALHA HTTP ${res.status}.`;
      diag.next_step = hint;
    }

    return NextResponse.json(diag, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    diag.anthropic_response = { exception: msg };
    diag.veredict = "❌ EXCECAO: " + msg;
    diag.next_step =
      msg.includes("aborted") || msg.includes("AbortError")
        ? "Timeout (10s): rede do Vercel nao conseguiu falar com api.anthropic.com. Geralmente transitorio, tenta dnv em 1 min."
        : "Excecao nao categorizada. Manda print disso pro Gabriel.";
    return NextResponse.json(diag, { status: 200 });
  } finally {
    clearTimeout(t);
  }
}
