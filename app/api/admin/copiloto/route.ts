import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { callClaude } from "@/lib/ai/claude";

export const runtime = "nodejs";
export const maxDuration = 30;

const TOOL = {
  name: "resumo_executivo",
  description: "Resumo executivo diario da operacao NGT",
  input_schema: {
    type: "object" as const,
    properties: {
      resumo: {
        type: "string",
        description: "2-3 frases sobre o estado geral da operacao",
      },
      prioridades: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            motivo: { type: "string" },
            urgencia: { type: "string", enum: ["alta", "media", "baixa"] },
          },
          required: ["titulo", "motivo", "urgencia"],
        },
      },
      lead_destaque: {
        type: "string",
        description: "O lead mais promissor e por que (1 frase). Vazio se nenhum.",
      },
    },
    required: ["resumo", "prioridades", "lead_destaque"],
  },
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }

  // valida admin
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!prof) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();
  const seteDias = new Date(Date.now() - 7 * 864e5).toISOString();

  const [contatos, simulacoes, cnpjs] = await Promise.all([
    admin
      .from("contact_submissions")
      .select("nome, email, empresa, mensagem, origem, status, created_at")
      .gte("created_at", seteDias)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("simulator_runs")
      .select("faturamento, setor, regime, total, created_at")
      .gte("created_at", seteDias)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("cnpj_lookups")
      .select("razao_social, porte, uf, perfil_tributario_sugerido, created_at")
      .gte("created_at", seteDias)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const dados = {
    contatos_7d: contatos.data || [],
    simulacoes_7d: (simulacoes.data || []).map((s) => ({
      ...s,
      faturamento: Number(s.faturamento),
      total: Number(s.total),
    })),
    consultas_cnpj_7d: cnpjs.data || [],
  };

  const totalLeads = dados.contatos_7d.length;
  const leadsNovos = dados.contatos_7d.filter((c) => c.status === "novo").length;

  const result = await callClaude({
    system: `Voce e o Copiloto NGT — analista de operacoes da NOMOS GT (consultoria tributaria). Analise os dados dos ultimos 7 dias e produza um resumo executivo ACIONAVEL para o gestor.

Regras:
- Priorize leads nao atendidos (status "novo"), simulacoes de alto valor e padroes.
- Seja especifico: cite nomes/empresas quando relevante.
- Urgencia alta = lead quente nao atendido ha dias ou oportunidade grande.
- Portugues brasileiro, direto, sem floreio.`,
    messages: [
      {
        role: "user",
        content: `Dados dos ultimos 7 dias (${totalLeads} leads, ${leadsNovos} sem atendimento):\n\n${JSON.stringify(dados, null, 1).slice(0, 12000)}\n\nUse a ferramenta resumo_executivo.`,
      },
    ],
    tool: TOOL,
    maxTokens: 1000,
  });

  if (result.error || !result.toolInput) {
    return NextResponse.json(
      { error: result.error || "Copiloto indisponivel" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ...(result.toolInput as Record<string, unknown>),
    stats: {
      leads_7d: totalLeads,
      leads_novos: leadsNovos,
      simulacoes_7d: dados.simulacoes_7d.length,
      cnpj_7d: dados.consultas_cnpj_7d.length,
    },
  });
}
