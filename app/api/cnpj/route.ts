import { NextResponse } from "next/server";
import { cnpjRequestSchema, type CnpjResponse } from "@/lib/validation/cnpj";
import {
  fetchBrasilApi,
  fetchReceitaWs,
  normalize,
  type CnpjRaw,
} from "@/lib/cnpj/fetchers";
import { analisarComClaude } from "@/lib/cnpj/analyze";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp, hashIp } from "@/lib/hash";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const ipHash = hashIp(ip);
  const { success } = await checkRateLimit(`cnpj:${ipHash || "anon"}`);
  if (!success) {
    return NextResponse.json(
      { error: "Muitas consultas. Aguarde um minuto." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = cnpjRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: fe.cnpj?.[0] || "CNPJ inválido", issues: fe },
      { status: 422 },
    );
  }
  const { cnpj } = parsed.data;

  // Busca em paralelo nas 2 fontes — se uma falhar, segue com a outra
  const [brasil, receita] = await Promise.all([
    fetchBrasilApi(cnpj),
    fetchReceitaWs(cnpj).catch(() => null),
  ]);

  if (!brasil && !receita) {
    return NextResponse.json(
      {
        error:
          "Não consegui consultar esse CNPJ nas fontes públicas. Verifique se está correto ou tente novamente em alguns minutos.",
      },
      { status: 502 },
    );
  }

  const empresa = normalize(brasil, receita);

  // Análise via Claude (silencioso se ANTHROPIC_API_KEY ausente)
  const analise = await analisarComClaude({ cnpj, ...empresa }).catch((e) => {
    console.error("[api/cnpj] erro Claude:", e);
    return null;
  });

  const fonte: ("brasilapi" | "receitaws")[] = [];
  if (brasil) fonte.push("brasilapi");
  if (receita) fonte.push("receitaws");

  // Persist no Supabase (se configurado, fire-and-forget)
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("cnpj_lookups").insert({
        cnpj,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        cnae_principal: empresa.cnae_principal,
        cnae_descricao: empresa.cnae_descricao,
        porte: empresa.porte,
        capital_social: empresa.capital_social,
        situacao_cadastral: empresa.situacao_cadastral,
        municipio: empresa.municipio,
        uf: empresa.uf,
        analise: analise || null,
        perfil_tributario_sugerido: analise?.perfil_tributario || null,
        raw_brasilapi: brasil?.data || null,
        raw_receitaws: receita?.data || null,
        user_agent: req.headers.get("user-agent")?.slice(0, 400) || null,
        ip_hash: ipHash,
        referrer: req.headers.get("referer")?.slice(0, 400) || null,
      });
    } catch (e) {
      // Falha silenciosa — não bloqueia resposta ao cliente
      console.warn("[api/cnpj] falha ao persistir:", e);
    }
  }

  const response: CnpjResponse = {
    cnpj,
    empresa,
    analise,
    fonte,
  };
  return NextResponse.json(response, { status: 200 });
}
