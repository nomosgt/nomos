/**
 * Camada de busca de dados de CNPJ em fontes públicas.
 * Estratégia:
 *  1. BrasilAPI (sem rate-limit explícito, dados consolidados)
 *  2. ReceitaWS como fallback / enriquecimento (3 req/min — usar com cuidado)
 *
 * Cada função retorna o JSON cru OU null se falhou. Decisão de mesclar fica
 * no orquestrador (route handler).
 */

export interface CnpjRaw {
  source: "brasilapi" | "receitaws";
  data: Record<string, unknown>;
}

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, ms = TIMEOUT_MS): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "NomosGT/1.0 (CNPJ lookup)" },
      cache: "no-store",
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchBrasilApi(cnpj: string): Promise<CnpjRaw | null> {
  const res = await fetchWithTimeout(
    `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  );
  if (!res || !res.ok) return null;
  try {
    const data = (await res.json()) as Record<string, unknown>;
    return { source: "brasilapi", data };
  } catch {
    return null;
  }
}

export async function fetchReceitaWs(cnpj: string): Promise<CnpjRaw | null> {
  const res = await fetchWithTimeout(
    `https://www.receitaws.com.br/v1/cnpj/${cnpj}`,
  );
  if (!res || !res.ok) return null;
  try {
    const data = (await res.json()) as Record<string, unknown>;
    // ReceitaWS retorna status: 'ERROR' em vez de HTTP 4xx em vários casos
    if ((data as { status?: string }).status === "ERROR") return null;
    return { source: "receitaws", data };
  } catch {
    return null;
  }
}

/**
 * Normaliza os dados das fontes em estrutura comum.
 * Prioriza BrasilAPI; preenche lacunas com ReceitaWS.
 */
export function normalize(
  brasil: CnpjRaw | null,
  receita: CnpjRaw | null,
): {
  razao_social: string | null;
  nome_fantasia: string | null;
  cnae_principal: string | null;
  cnae_descricao: string | null;
  porte: string | null;
  capital_social: number | null;
  situacao_cadastral: string | null;
  municipio: string | null;
  uf: string | null;
  data_abertura: string | null;
  socios: string[];
} {
  const b = (brasil?.data || {}) as Record<string, unknown>;
  const r = (receita?.data || {}) as Record<string, unknown>;

  const num = (v: unknown): number | null => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  const str = (...candidates: unknown[]): string | null => {
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) return c.trim();
    }
    return null;
  };

  const cnae_b = b.cnae_fiscal != null ? String(b.cnae_fiscal) : null;
  const cnae_r =
    (r.atividade_principal as Array<{ code?: string; text?: string }>)?.[0]
      ?.code || null;

  const cnaeDesc_b = b.cnae_fiscal_descricao as string | undefined;
  const cnaeDesc_r =
    (r.atividade_principal as Array<{ code?: string; text?: string }>)?.[0]
      ?.text || undefined;

  const socios_b = (b.qsa as Array<{ nome_socio?: string }> | undefined)?.map(
    (s) => s.nome_socio,
  ).filter(Boolean) as string[] | undefined;
  const socios_r = (r.qsa as Array<{ nome?: string }> | undefined)?.map(
    (s) => s.nome,
  ).filter(Boolean) as string[] | undefined;

  return {
    razao_social: str(b.razao_social, r.nome),
    nome_fantasia: str(b.nome_fantasia, r.fantasia),
    cnae_principal: str(cnae_b, cnae_r),
    cnae_descricao: str(cnaeDesc_b, cnaeDesc_r),
    porte: str(b.porte, r.porte),
    capital_social: num(b.capital_social ?? r.capital_social),
    situacao_cadastral: str(b.descricao_situacao_cadastral, r.situacao),
    municipio: str(b.municipio, r.municipio),
    uf: str(b.uf, r.uf),
    data_abertura: str(b.data_inicio_atividade, r.abertura),
    socios: socios_b || socios_r || [],
  };
}
