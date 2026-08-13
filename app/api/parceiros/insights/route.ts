import { NextResponse } from "next/server";
import { callClaude } from "@/lib/ai/claude";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Insights IA da Central do Parceiro.
 * O parceiro envia um snapshot dos dados dele (localStorage) e recebe
 * recomendacoes acionaveis. Protegido pelo cookie ngt_parceiros.
 */

const schema = z.object({
  snapshot: z.object({
    projetos: z.array(z.record(z.string(), z.unknown())).max(100),
    trabalhos: z.array(z.record(z.string(), z.unknown())).max(100),
    comissoes: z.array(z.record(z.string(), z.unknown())).max(100),
    clientes_count: z.number().max(10000),
  }),
});

const TOOL = {
  name: "insights_parceiro",
  description: "Insights acionaveis para o parceiro Arché",
  input_schema: {
    type: "object" as const,
    properties: {
      resumo: { type: "string", description: "1-2 frases sobre o estado geral" },
      alertas: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            detalhe: { type: "string" },
            tipo: { type: "string", enum: ["prazo", "financeiro", "oportunidade", "pendencia"] },
          },
          required: ["titulo", "detalhe", "tipo"],
        },
      },
      proxima_acao: { type: "string", description: "A acao mais importante agora (1 frase)" },
    },
    required: ["resumo", "alertas", "proxima_acao"],
  },
};

export async function POST(req: Request) {
  // guard: cookie do portal
  const cookie = req.headers.get("cookie") || "";
  if (!/ngt_parceiros=[a-f0-9]{40}/.test(cookie)) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }

  const snap = parsed.data.snapshot;

  const result = await callClaude({
    system: `Voce e o assistente de operacoes da Central do Parceiro Arché (consultoria tributaria). Analise o snapshot do parceiro e gere insights ACIONAVEIS.

Regras:
- Priorize: prazos vencidos/proximos, demandas pendentes ha muito tempo, comissoes previstas sem movimento.
- Cite nomes de projetos especificos.
- Portugues brasileiro direto. Sem elogios vazios.`,
    messages: [
      {
        role: "user",
        content: `Snapshot do parceiro (hoje = ${new Date().toISOString().slice(0, 10)}):\n${JSON.stringify(snap, null, 1).slice(0, 9000)}\n\nUse a ferramenta insights_parceiro.`,
      },
    ],
    tool: TOOL,
    maxTokens: 800,
  });

  if (result.error || !result.toolInput) {
    return NextResponse.json(
      { error: result.error || "Insights indisponiveis" },
      { status: 502 },
    );
  }

  return NextResponse.json(result.toolInput);
}
