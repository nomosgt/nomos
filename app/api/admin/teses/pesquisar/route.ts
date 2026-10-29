import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Admin · Pesquisa IA de teses. Consultor sênior que responde dúvidas de
 * teses tributárias, cruzando com o ACERVO próprio da Arché + contexto de
 * empresa (CNAE/setor) quando informado. Não inventa; marca o que é
 * oportunidade vs. consolidado e sempre pede confirmação documental.
 */

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return Boolean(prof);
}

const bodySchema = z.object({
  pergunta: z.string().min(3).max(1000),
  setor: z.string().max(120).optional(),
  regime: z.string().max(40).optional(),
});

const TOOL = {
  name: "responder_pesquisa",
  description: "Devolve a pesquisa estruturada de teses tributárias.",
  input_schema: {
    type: "object",
    properties: {
      resposta: { type: "string", description: "Análise técnica em 2-5 frases, português jurídico-tributário." },
      teses_aplicaveis: {
        type: "array", maxItems: 8,
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            aderencia: { type: "string", enum: ["alta", "media", "baixa"] },
            porque: { type: "string" },
            no_acervo: { type: "boolean", description: "true se consta no acervo Arché fornecido" },
          },
          required: ["nome", "aderencia", "porque", "no_acervo"],
        },
      },
      proximos_passos: { type: "array", maxItems: 5, items: { type: "string" } },
      confianca: { type: "string", enum: ["alta", "media", "baixa"] },
      ressalva: { type: "string", description: "Ressalva obrigatória: estimativa preliminar sujeita a confirmação documental/jurisprudencial." },
    },
    required: ["resposta", "teses_aplicaveis", "proximos_passos", "confianca", "ressalva"],
  },
};

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "IA indisponivel (sem ANTHROPIC_API_KEY)." }, { status: 503 });

  // contexto: acervo próprio (nome + resumo + precedente + status)
  const admin = createAdminClient();
  const { data: acervo } = await admin
    .from("teses")
    .select("nome, resumo, precedente, status_jur, tributos, setores")
    .limit(200);
  const contextoAcervo = (acervo ?? [])
    .map((t) => `- ${t.nome} [${(t.tributos || []).join("/")}] (${t.precedente || "s/ precedente"}; ${t.status_jur}): ${t.resumo}`)
    .join("\n");

  const system = `Voce e um consultor tributario senior da Arché, especializada em recuperacao de creditos para empresas de medio e grande porte.
Responda a duvida do usuario sobre teses tributarias brasileiras com rigor tecnico.
Regras:
1. Honesto. Nunca invente precedente, numero de tema ou RE/REsp. Se nao tiver certeza do numero, descreva a tese sem citar numero falso.
2. Priorize e marque as teses que constam no ACERVO ARCHÉ abaixo (no_acervo=true). Pode sugerir teses fora do acervo (no_acervo=false), deixando claro.
3. Diferencie o que e tese consolidada/firmada do que e oportunidade em discussao (mais arriscada).
4. Sempre inclua a ressalva de que e estimativa preliminar sujeita a confirmacao documental e jurisprudencial.
5. Portugues tecnico, conciso. Use SEMPRE a ferramenta responder_pesquisa.

ACERVO ARCHÉ:
${contextoAcervo || "(acervo vazio)"}`;

  const userMsg = `Pergunta: ${parsed.data.pergunta}
${parsed.data.setor ? `Setor/atividade da empresa: ${parsed.data.setor}` : ""}
${parsed.data.regime ? `Regime tributario: ${parsed.data.regime}` : ""}

Responda com a ferramenta responder_pesquisa.`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 28000);
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
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 1800,
        system,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "responder_pesquisa" },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `IA HTTP ${res.status}`, debug: txt.slice(0, 200) }, { status: 502 });
    }
    const json = (await res.json()) as { content: Array<{ type: string; name?: string; input?: unknown }> };
    const tool = json.content.find((c) => c.type === "tool_use" && c.name === "responder_pesquisa");
    if (!tool?.input) return NextResponse.json({ error: "IA nao retornou resultado." }, { status: 502 });
    return NextResponse.json({ resultado: tool.input });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Falha na pesquisa IA", debug: msg }, { status: 500 });
  } finally {
    clearTimeout(t);
  }
}
