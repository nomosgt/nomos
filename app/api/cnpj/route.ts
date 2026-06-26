import { NextResponse } from "next/server";
import { cnpjRequestSchema, type CnpjResponse } from "@/lib/validation/cnpj";
import {
  fetchBrasilApi,
  fetchReceitaWs,
  normalize,
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
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = cnpjRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { error: fe.cnpj?.[0] || "CNPJ invalido", issues: fe },
      { status: 422 },
    );
  }
  const { cnpj } = parsed.data;

  const [brasil, receita] = await Promise.all([
    fetchBrasilApi(cnpj),
    fetchReceitaWs(cnpj).catch(() => null),
  ]);

  if (!brasil && !receita) {
    return NextResponse.json(
      {
        error:
          "Nao consegui consultar esse CNPJ nas fontes publicas. Verifique se esta correto ou tente novamente em alguns minutos.",
      },
      { status: 502 },
    );
  }

  const empresa = normalize(brasil, receita);

  const analiseResult = await analisarComClaude({ cnpj, ...empresa }).catch(
    (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[api/cnpj] erro Claude:", msg);
      return { analise: null, debug: `Excecao geral: ${msg}` };
    },
  );
  const analise = analiseResult.analise;
  const analiseDebug = analiseResult.debug;

  const fonte: ("brasilapi" | "receitaws")[] = [];
  if (brasil) fonte.push("brasilapi");
  if (receita) fonte.push("receitaws");

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      void supabase
        .from("cnpj_lookups")
        .insert({
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
        })
        .then((r) => {
          if (r.error) console.warn("[api/cnpj] persist err:", r.error.message);
        });
    } catch (e) {
      console.warn("[api/cnpj] falha ao instanciar Supabase:", e);
    }
  }

  const response: CnpjResponse & { analise_debug?: string } = {
    cnpj,
    empresa,
    analise,
    fonte,
    ...(analiseDebug ? { analise_debug: analiseDebug } : {}),
  };
  return NextResponse.json(response, { status: 200 });
}
