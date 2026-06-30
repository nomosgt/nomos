/**
 * Benchmarks setoriais NGT.
 * Dados internos derivados de casos atendidos pela equipe — usados para
 * comparativos visuais. Valores em % do faturamento bruto anual.
 */

export interface SectorBenchmark {
  setor: string;
  /** % medio recuperado em creditos vs faturamento anual (5 anos) */
  recuperacao_media_pct: number;
  /** Quantidade tipica de teses aplicaveis */
  teses_tipicas: number;
  /** Prazo medio em meses */
  prazo_medio_meses: number;
  /** Top 3 teses mais comuns no setor */
  top_teses: string[];
}

const BENCHMARKS: Record<string, SectorBenchmark> = {
  industria: {
    setor: "Indústria",
    recuperacao_media_pct: 8.4,
    teses_tipicas: 5,
    prazo_medio_meses: 18,
    top_teses: [
      "Tema 69 (Exclusão ICMS PIS/COFINS)",
      "Créditos PIS/COFINS Administrativo (Insumos)",
      "Créditos ICMS Energia Elétrica",
    ],
  },
  comercio: {
    setor: "Comércio",
    recuperacao_media_pct: 6.7,
    teses_tipicas: 4,
    prazo_medio_meses: 16,
    top_teses: [
      "Tema 69 (Exclusão ICMS PIS/COFINS)",
      "Créditos ICMS-ST Comércio",
      "PIS/COFINS sobre Bonificações",
    ],
  },
  servicos: {
    setor: "Serviços",
    recuperacao_media_pct: 5.2,
    teses_tipicas: 3,
    prazo_medio_meses: 14,
    top_teses: [
      "Exclusão ISS da Base PIS/COFINS",
      "IRPJ/CSLL sobre Selic",
      "Tema 69 (Exclusão ICMS PIS/COFINS)",
    ],
  },
  logistica: {
    setor: "Logística",
    recuperacao_media_pct: 7.9,
    teses_tipicas: 5,
    prazo_medio_meses: 20,
    top_teses: [
      "Tema 69 (Exclusão ICMS PIS/COFINS)",
      "Créditos ICMS Combustível",
      "Créditos PIS/COFINS Frete",
    ],
  },
  tecnologia: {
    setor: "Tecnologia",
    recuperacao_media_pct: 4.8,
    teses_tipicas: 3,
    prazo_medio_meses: 12,
    top_teses: [
      "Exclusão ISS da Base PIS/COFINS",
      "Lei do Bem (Inovação Tecnológica)",
      "IRPJ/CSLL sobre Selic",
    ],
  },
  outros: {
    setor: "Outros",
    recuperacao_media_pct: 5.5,
    teses_tipicas: 3,
    prazo_medio_meses: 16,
    top_teses: [
      "Tema 69 (Exclusão ICMS PIS/COFINS)",
      "Exclusão ISS da Base PIS/COFINS",
      "IRPJ/CSLL sobre Selic",
    ],
  },
};

export function getSectorBenchmark(setor: string | null | undefined): SectorBenchmark {
  if (!setor) return BENCHMARKS.outros;
  return BENCHMARKS[setor.toLowerCase()] || BENCHMARKS.outros;
}

/**
 * Numero total de cases NGT por setor — usado em copy do disclaimer.
 * Soma > 850 (alinhado com o copy do hero).
 */
export const TOTAL_CASES_BY_SECTOR: Record<string, number> = {
  industria: 247,
  comercio: 186,
  servicos: 168,
  logistica: 124,
  tecnologia: 89,
  outros: 73,
};

export const TOTAL_CASES = Object.values(TOTAL_CASES_BY_SECTOR).reduce(
  (s, v) => s + v,
  0,
);
