import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Admin · IA por tese.
 * POST { tese_id, modo: 'aprofundar' | 'parecer' | 'potencial', contexto? }
 *  - aprofundar: a IA preenche o dossiê (fundamentação, jurisprudência,
 *    como identificar, documentos, base de cálculo, passo a passo) e SALVA.
 *  - parecer: redige um memorando da tese para um cliente/contexto.
 *  - potencial: estima a faixa de recuperação a partir do faturamento/contexto.
 */

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return Boolean(prof);
}

const bodySchema = z.object({
  tese_id: z.string().uuid(),
  modo: z.enum(["aprofundar", "parecer", "potencial"]),
  contexto: z.string().max(1500).optional(),
});

const TOOL_APROFUNDAR = {
  name: "preencher_dossie",
  description: "Preenche o dossiê técnico da tese.",
  input_schema: {
    type: "object",
    properties: {
      fundamentacao_detalhada: { type: "string", description: "2-5 frases: fundamento jurídico, o que foi decidido, modulação se houver." },
      jurisprudencia: { type: "array", maxItems: 8, items: { type: "string" }, description: "Precedentes/decisões (não invente números; se incerto, descreva sem número)." },
      como_identificar: { type: "string", description: "Como identificar a aplicabilidade na empresa." },
      documentos: { type: "array", maxItems: 12, items: { type: "string" } },
      base_calculo: { type: "string", description: "Como se calcula o valor recuperável." },
      passo_a_passo: { type: "array", maxItems: 8, items: { type: "string" } },
      prazo_prescricional: { type: "string" },
      orgao: { type: "string" },
    },
    required: ["fundamentacao_detalhada", "jurisprudencia", "como_identificar", "documentos", "base_calculo", "passo_a_passo"],
  },
};

const TOOL_TEXTO = {
  name: "redigir",
  description: "Devolve o texto solicitado de forma estruturada.",
  input_schema: {
    type: "object",
    properties: {
      titulo: { type: "string" },
      corpo: { type: "string", description: "Texto técnico em português jurídico-tributário." },
      ressalva: { type: "string", description: "Ressalva de estimativa preliminar sujeita a confirmação documental." },
    },
    required: ["titulo", "corpo", "ressalva"],
  },
};

async function callClaude(apiKey: string, system: string, user: string, tool: object, toolName: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 28000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system,
        tools: [tool],
        tool_choice: { type: "tool", name: toolName },
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return { erro: `IA HTTP ${res.status}` };
    const json = (await res.json()) as { content: Array<{ type: string; name?: string; input?: unknown }> };
    const tu = json.content.find((c) => c.type === "tool_use" && c.name === toolName);
    return tu?.input ? { input: tu.input } : { erro: "IA não retornou resultado." };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "falha" };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "IA indisponivel (sem ANTHROPIC_API_KEY)." }, { status: 503 });

  const admin = createAdminClient();
  const { data: tese } = await admin
    .from("teses")
    .select("nome, resumo, fundamento, precedente, tributos, status_jur, setores, regimes, retroatividade")
    .eq("id", parsed.data.tese_id)
    .maybeSingle();
  if (!tese) return NextResponse.json({ error: "Tese nao encontrada" }, { status: 404 });

  const ctx = `Tese: ${tese.nome}\nResumo: ${tese.resumo}\nTributos: ${(tese.tributos || []).join(", ")}\nPrecedente: ${tese.precedente || "—"}\nStatus: ${tese.status_jur}\nRetroatividade: ${tese.retroatividade || "—"}`;

  if (parsed.data.modo === "aprofundar") {
    const system = `Voce e um consultor tributario senior da Arché. Preencha o dossiê técnico da tese abaixo com rigor. NUNCA invente números de Tema/RE/REsp — se nao tiver certeza, descreva sem citar número. Portugues técnico. Use a ferramenta preencher_dossie.`;
    const r = await callClaude(apiKey, system, ctx, TOOL_APROFUNDAR, "preencher_dossie");
    if (r.erro) return NextResponse.json({ error: r.erro }, { status: 502 });
    const d = r.input as Record<string, unknown>;
    // salva no dossiê
    await admin.from("teses").update({
      fundamentacao_detalhada: d.fundamentacao_detalhada ?? null,
      jurisprudencia: Array.isArray(d.jurisprudencia) ? d.jurisprudencia : [],
      como_identificar: d.como_identificar ?? null,
      documentos: Array.isArray(d.documentos) ? d.documentos : [],
      base_calculo: d.base_calculo ?? null,
      passo_a_passo: Array.isArray(d.passo_a_passo) ? d.passo_a_passo : [],
      prazo_prescricional: d.prazo_prescricional ?? null,
      orgao: d.orgao ?? null,
      dossie_ia: true,
      updated_at: new Date().toISOString(),
    }).eq("id", parsed.data.tese_id);
    return NextResponse.json({ ok: true, modo: "aprofundar", dossie: d });
  }

  if (parsed.data.modo === "parecer") {
    const system = `Voce e um consultor tributario senior da Arché. Redija um memorando objetivo sobre a aplicacao da tese ao contexto informado — linguagem para um CFO. Honesto quanto a riscos. Use a ferramenta redigir.`;
    const user = `${ctx}\n\nContexto/cliente: ${parsed.data.contexto || "empresa genérica"}\n\nRedija o memorando.`;
    const r = await callClaude(apiKey, system, user, TOOL_TEXTO, "redigir");
    if (r.erro) return NextResponse.json({ error: r.erro }, { status: 502 });
    return NextResponse.json({ ok: true, modo: "parecer", texto: r.input });
  }

  // potencial
  const system = `Voce e um consultor tributario senior da Arché. Estime, em FAIXA e de forma conservadora, o potencial de recuperacao da tese a partir do contexto/faturamento informado. Deixe claro que e estimativa preliminar. NUNCA prometa valores exatos. Use a ferramenta redigir (titulo=faixa estimada, corpo=racional, ressalva).`;
  const user = `${ctx}\n\nContexto/faturamento: ${parsed.data.contexto || "não informado"}\n\nEstime a faixa de potencial.`;
  const r = await callClaude(apiKey, system, user, TOOL_TEXTO, "redigir");
  if (r.erro) return NextResponse.json({ error: r.erro }, { status: 502 });
  return NextResponse.json({ ok: true, modo: "potencial", texto: r.input });
}
