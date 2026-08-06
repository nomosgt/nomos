import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { callClaude } from "@/lib/ai/claude";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({ contato_id: z.string().uuid() });

const TOOL = {
  name: "analise_lead",
  description: "Qualificacao e estrategia de abordagem do lead",
  input_schema: {
    type: "object" as const,
    properties: {
      score: { type: "number", minimum: 0, maximum: 100, description: "Score de qualificacao 0-100" },
      temperatura: { type: "string", enum: ["quente", "morno", "frio"] },
      perfil: { type: "string", description: "1-2 frases sobre quem e esse lead" },
      abordagem: { type: "string", description: "Como abordar: canal, tom e gancho (2-3 frases)" },
      primeiro_contato: { type: "string", description: "Rascunho de mensagem de primeiro contato via WhatsApp, pronta pra copiar (max 400 chars, tom profissional-proximo, sem promessas de valores)" },
    },
    required: ["score", "temperatura", "perfil", "abordagem", "primeiro_contato"],
  },
};

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!prof) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "contato_id invalido" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: contato } = await admin
    .from("contact_submissions")
    .select("*")
    .eq("id", parsed.data.contato_id)
    .maybeSingle();

  if (!contato) return NextResponse.json({ error: "Contato nao encontrado" }, { status: 404 });

  const result = await callClaude({
    system: `Voce e o estrategista comercial da NOMOS GT (consultoria tributaria brasileira, recuperacao de creditos, honorarios por exito).

Analise o lead e produza qualificacao + estrategia de abordagem.

Regras:
- Score alto = empresa com faturamento relevante, dor clara, veio do simulador com estimativa alta, dados completos.
- A mensagem de primeiro contato NUNCA promete valores ou resultados; referencia o que a pessoa fez no site (simulacao/contato) e oferece diagnostico gratuito.
- Compliance OAB: sem captacao agressiva, tom consultivo.
- Portugues brasileiro.`,
    messages: [
      {
        role: "user",
        content: `Lead:\n${JSON.stringify(contato, null, 1).slice(0, 4000)}\n\nUse a ferramenta analise_lead.`,
      },
    ],
    tool: TOOL,
    maxTokens: 800,
  });

  if (result.error || !result.toolInput) {
    return NextResponse.json(
      { error: result.error || "Analise indisponivel" },
      { status: 502 },
    );
  }

  return NextResponse.json(result.toolInput);
}
