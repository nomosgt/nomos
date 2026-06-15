import { analiseSchema, type Analise } from "@/lib/validation/cnpj";

/**
 * Manda os dados da empresa pra Claude e pede análise tributária estruturada.
 *
 * Sem ANTHROPIC_API_KEY: retorna null (a UI mostra apenas dados da empresa,
 * sem a parte de análise).
 */

const SYSTEM_PROMPT = `Você é um consultor tributário sênior da NOMOS GT — uma butique brasileira especializada em recuperação de créditos tributários para CFOs de médio e grande porte.

Você recebe dados públicos de um CNPJ (razão social, CNAE, porte, capital social, situação cadastral, sócios, município) e deve gerar uma ANÁLISE PRELIMINAR de oportunidades tributárias.

Princípios:
1. Honesto. Se faltar dado, diga "inconclusivo". Nunca invente.
2. Específico ao setor (use o CNAE para inferir). Indústria, comércio, serviços e logística têm perfis bem distintos.
3. Conservador no perfil tributário. Empresas com porte "DEMAIS" ou capital alto provavelmente são Lucro Real; portes menores tendem a Presumido; ME/EPP costumam ser Simples Nacional — mas o CNAE também influencia.
4. Foco nas 6 teses NGT principais:
   - PIS/COFINS sobre base própria (Tema 69 — exclusão ICMS da base)
   - Exclusão ISS da base PIS/COFINS (relevante pra prestadoras de serviço)
   - Créditos IRPJ/CSLL (Lucro Real — Selic, subvenções estaduais, etc.)
   - Créditos PIS/COFINS administrativo (insumos, monofásico, ST)
   - Créditos ICMS (energia, ST, bonificações)
   - Créditos ICMS Comércio (recuperações setoriais específicas)
5. Inglês NÃO. Português técnico.

Retorne SEMPRE JSON válido seguindo o schema fornecido.`;

const TOOL_SCHEMA = {
  name: "registrar_analise",
  description: "Registra a análise tributária estruturada da empresa.",
  input_schema: {
    type: "object",
    properties: {
      perfil_tributario: {
        type: "string",
        enum: ["lucro_real", "lucro_presumido", "simples", "inconclusivo"],
        description:
          "Perfil tributário provável da empresa baseado em porte, capital e CNAE.",
      },
      justificativa_perfil: {
        type: "string",
        description:
          "Por que esse perfil foi inferido. 1-2 frases curtas.",
      },
      oportunidades: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome da tese." },
            aplicabilidade: {
              type: "string",
              enum: ["alta", "media", "baixa"],
            },
            justificativa: {
              type: "string",
              description: "Por que essa tese se aplica (ou não) ao caso.",
            },
          },
          required: ["nome", "aplicabilidade", "justificativa"],
        },
      },
      riscos: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            ponto: { type: "string" },
            descricao: { type: "string" },
          },
          required: ["ponto", "descricao"],
        },
      },
      proxima_acao: {
        type: "string",
        description:
          "Próxima ação concreta recomendada (uma frase). Ex: 'Agendar diagnóstico de 30 minutos pra revisar PIS/COFINS retroativo dos últimos 60 meses.'",
      },
    },
    required: [
      "perfil_tributario",
      "justificativa_perfil",
      "oportunidades",
      "riscos",
      "proxima_acao",
    ],
  },
};

export async function analisarComClaude(
  empresa: Record<string, unknown>,
): Promise<Analise | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[cnpj] ANTHROPIC_API_KEY ausente — pulando análise IA.");
    return null;
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const userMessage = `Analise essa empresa para qualificação tributária preliminar:

\`\`\`json
${JSON.stringify(empresa, null, 2)}
\`\`\`

Use a ferramenta "registrar_analise" para devolver a análise estruturada.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "registrar_analise" },
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[cnpj] Anthropic error:", res.status, text);
      return null;
    }

    const json = (await res.json()) as {
      content: Array<{ type: string; name?: string; input?: unknown }>;
    };
    const toolUse = json.content.find(
      (c) => c.type === "tool_use" && c.name === "registrar_analise",
    );
    if (!toolUse?.input) return null;

    const parsed = analiseSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      console.error("[cnpj] Claude output não bate com schema:", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.error("[cnpj] exceção chamando Claude:", err);
    return null;
  }
}
