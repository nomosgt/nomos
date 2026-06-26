import { analiseSchema, type Analise } from "@/lib/validation/cnpj";

const SYSTEM_PROMPT = `Voce e um consultor tributario senior da NOMOS GT — uma butique brasileira especializada em recuperacao de creditos tributarios para CFOs de medio e grande porte.

Voce recebe dados publicos de um CNPJ (razao social, CNAE, porte, capital social, situacao cadastral, socios, municipio) e deve gerar uma ANALISE PRELIMINAR de oportunidades tributarias.

Principios:
1. Honesto. Se faltar dado, diga "inconclusivo". Nunca invente.
2. Especifico ao setor (use o CNAE para inferir).
3. Conservador no perfil tributario. Empresas grandes tendem a Lucro Real; medias a Presumido; ME/EPP a Simples Nacional.
4. Foco nas teses NGT: Tema 69, ISS, IRPJ/CSLL, PIS/COFINS admin, ICMS energia/ST, ICMS Comercio.
5. Portugues tecnico, conciso.

Retorne SEMPRE JSON valido seguindo o schema fornecido.`;

const TOOL_SCHEMA = {
  name: "registrar_analise",
  description: "Registra a analise tributaria estruturada da empresa.",
  input_schema: {
    type: "object",
    properties: {
      perfil_tributario: {
        type: "string",
        enum: ["lucro_real", "lucro_presumido", "simples", "inconclusivo"],
      },
      justificativa_perfil: { type: "string" },
      oportunidades: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            aplicabilidade: { type: "string", enum: ["alta", "media", "baixa"] },
            justificativa: { type: "string" },
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
      proxima_acao: { type: "string" },
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

export interface AnalyzeResult {
  analise: Analise | null;
  debug?: string;
}

export async function analisarComClaude(
  empresa: Record<string, unknown>,
): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const msg = "ANTHROPIC_API_KEY ausente nas env vars do Vercel.";
    console.warn("[cnpj]", msg);
    return { analise: null, debug: msg };
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const userMessage = `Analise essa empresa para qualificacao tributaria preliminar:

\`\`\`json
${JSON.stringify(empresa, null, 2)}
\`\`\`

Use a ferramenta "registrar_analise" para devolver a analise estruturada.`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);

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
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "registrar_analise" },
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const msg = `Anthropic HTTP ${res.status} — ${text.slice(0, 300)}`;
      console.error("[cnpj]", msg);
      return { analise: null, debug: msg };
    }

    const json = (await res.json()) as {
      content: Array<{ type: string; name?: string; input?: unknown }>;
    };
    const toolUse = json.content.find(
      (c) => c.type === "tool_use" && c.name === "registrar_analise",
    );
    if (!toolUse?.input) {
      return {
        analise: null,
        debug: "Claude nao usou a ferramenta registrar_analise.",
      };
    }

    const parsed = analiseSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      const msg = `Output Claude nao bate com schema: ${parsed.error.message.slice(0, 200)}`;
      console.error("[cnpj]", msg);
      return { analise: null, debug: msg };
    }
    return { analise: parsed.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cnpj] excecao chamando Claude:", msg);
    return { analise: null, debug: `Excecao: ${msg}` };
  } finally {
    clearTimeout(t);
  }
}
