import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { callClaude, type ClaudeMessage } from "@/lib/ai/claude";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  mensagem: z.string().min(1).max(2000),
  historico: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(12)
    .default([]),
});

const SYSTEM_BASE = `Voce e o Assistente NGT — assistente virtual da NOMOS GT (consultoria tributaria brasileira) dentro da area exclusiva do cliente (Sala NGT).

Regras:
1. Responda APENAS sobre: o caso do cliente (contexto fornecido), conceitos tributarios gerais (Tema 69, PIS/COFINS, ICMS, regimes tributarios), prazos processuais em termos gerais, e uso da plataforma.
2. NUNCA prometa resultados, valores ou prazos especificos alem dos ja registrados no caso.
3. NUNCA de aconselhamento juridico novo — para decisoes, oriente falar com a equipe NGT (botao Suporte).
4. Tom: profissional, claro, acolhedor. Portugues brasileiro. Respostas curtas (2-5 frases quando possivel).
5. Se nao souber ou o assunto fugir do escopo, diga que vai acionar a equipe e sugira o Suporte.
6. Nunca invente dados do caso que nao estejam no contexto.`;

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }

  // autentica cliente
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

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

  // contexto do caso via service role
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("client_profiles")
    .select("nome, empresa")
    .eq("user_id", u.user.id)
    .maybeSingle();

  const { data: caso } = await admin
    .from("client_cases")
    .select("id, titulo, tese, descricao, etapa, status, proxima_acao, potencial_estimado, valor_recuperado")
    .eq("client_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let updatesTxt = "";
  if (caso?.id) {
    const { data: updates } = await admin
      .from("case_updates")
      .select("titulo, corpo, tipo, created_at")
      .eq("case_id", caso.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (updates?.length) {
      updatesTxt =
        "Ultimas atualizacoes do caso:\n" +
        updates.map((up) => `- [${up.tipo}] ${up.titulo}: ${up.corpo || ""}`).join("\n");
    }
  }

  const contexto = [
    profile ? `Cliente: ${profile.nome}${profile.empresa ? " — " + profile.empresa : ""}` : null,
    caso
      ? `Caso: ${caso.titulo} | Tese: ${caso.tese || "n/d"} | Status: ${caso.status} | Etapa: ${caso.etapa} de 7` +
        (caso.proxima_acao ? ` | Proxima acao registrada: ${caso.proxima_acao}` : "")
      : "Nenhum caso registrado ainda.",
    caso?.descricao ? `Descricao do caso: ${caso.descricao}` : null,
    updatesTxt || null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ClaudeMessage[] = [
    ...parsed.data.historico,
    { role: "user", content: parsed.data.mensagem },
  ];

  const result = await callClaude({
    system: SYSTEM_BASE + "\n\n=== CONTEXTO DO CLIENTE ===\n" + contexto,
    messages,
    maxTokens: 600,
  });

  if (result.error || !result.text) {
    return NextResponse.json(
      { error: "Assistente indisponivel no momento. Use o Suporte." },
      { status: 502 },
    );
  }

  return NextResponse.json({ resposta: result.text });
}
