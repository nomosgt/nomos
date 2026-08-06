/**
 * Helper unificado de chamadas Claude — usado por toda a plataforma NGT.
 * Timeout, retry leve e suporte a tool_use estruturado.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 28000;

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResult {
  text: string | null;
  toolInput: unknown | null;
  error: string | null;
}

interface CallOpts {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  /** Se informado, força tool_use com esse schema */
  tool?: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  };
  model?: string;
}

export async function callClaude(opts: CallOpts): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { text: null, toolInput: null, error: "ANTHROPIC_API_KEY ausente" };
  }

  const model = opts.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 1200,
    system: opts.system,
    messages: opts.messages,
  };
  if (opts.tool) {
    body.tools = [opts.tool];
    body.tool_choice = { type: "tool", name: opts.tool.name };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        text: null,
        toolInput: null,
        error: `Anthropic HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as {
      content: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    };

    if (opts.tool) {
      const tu = json.content.find(
        (c) => c.type === "tool_use" && c.name === opts.tool!.name,
      );
      return { text: null, toolInput: tu?.input ?? null, error: tu ? null : "tool_use ausente" };
    }

    const textBlock = json.content.find((c) => c.type === "text");
    return { text: textBlock?.text ?? null, toolInput: null, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: null, toolInput: null, error: `Excecao: ${msg}` };
  } finally {
    clearTimeout(t);
  }
}
