/**
 * Catálogo de teses tributárias NGT com pesos específicos por setor.
 * Cada tese é avaliada em 3 cenários (pessimista/base/otimista) via percentual
 * aplicado sobre a base de cálculo definida.
 */

import type { CategoriaTese, Aderencia, RiscoJuridico } from "./types";

export type SetorKey =
  | "industria"
  | "comercio"
  | "servicos"
  | "logistica"
  | "tecnologia"
  | "outros";

export interface TeseTemplate {
  nome: string;
  categoria: CategoriaTese;
  base: "faturamento" | "despesa_indireta" | "faturamento_e_despesa";
  base_calculo_descricao: string;
  /** Percentual aplicado à base, por cenário (fração — 0.05 = 5%) */
  pct_pessimista: number;
  pct_base: number;
  pct_otimista: number;
  aderencia_por_setor: Partial<Record<SetorKey, Aderencia>>;
  aderencia_default: Aderencia;
  risco_juridico: RiscoJuridico;
  prazo_meses: number;
  docs_necessarios: string[];
}

/**
 * As teses seguem convenção NGT — números conservadores.
 * Todas as bases são anualizadas: o cálculo final multiplica por janelaAnos.
 */
export const TESES_CATALOG: TeseTemplate[] = [
  {
    nome: "Tema 69 — Exclusão ICMS da base PIS/COFINS",
    categoria: "administrativa_retroativa",
    base: "faturamento",
    base_calculo_descricao: "Sobre faturamento tributado × alíquota efetiva PIS/COFINS",
    pct_pessimista: 0.008,
    pct_base: 0.02,
    pct_otimista: 0.04,
    aderencia_por_setor: {
      industria: "alta",
      comercio: "alta",
      logistica: "alta",
      servicos: "media",
      tecnologia: "media",
    },
    aderencia_default: "media",
    risco_juridico: "baixo",
    prazo_meses: 12,
    docs_necessarios: ["SPED Contribuições", "EFD ICMS/IPI", "Balancetes", "DCTF"],
  },
  {
    nome: "PIS/COFINS sobre Insumos (créditos administrativos)",
    categoria: "administrativa_retroativa",
    base: "despesa_indireta",
    base_calculo_descricao: "Sobre despesa indireta anual × alíquota PIS/COFINS",
    pct_pessimista: 0.015,
    pct_base: 0.045,
    pct_otimista: 0.075,
    aderencia_por_setor: {
      industria: "alta",
      logistica: "alta",
      comercio: "media",
      servicos: "baixa",
      tecnologia: "baixa",
    },
    aderencia_default: "media",
    risco_juridico: "baixo",
    prazo_meses: 8,
    docs_necessarios: ["SPED Contribuições", "XMLs de compra", "Balancetes"],
  },
  {
    nome: "ICMS — Energia elétrica (aproveitamento)",
    categoria: "administrativa_recorrente",
    base: "despesa_indireta",
    base_calculo_descricao: "Sobre gasto anual com energia (~5-15% da DI industrial)",
    pct_pessimista: 0.003,
    pct_base: 0.01,
    pct_otimista: 0.02,
    aderencia_por_setor: {
      industria: "alta",
      logistica: "media",
      comercio: "media",
      servicos: "baixa",
      tecnologia: "baixa",
    },
    aderencia_default: "baixa",
    risco_juridico: "baixo",
    prazo_meses: 10,
    docs_necessarios: ["Contas de energia (60 meses)", "SPED Fiscal", "Laudos técnicos"],
  },
  {
    nome: "ICMS — Frete e Insumos de Transporte",
    categoria: "administrativa_retroativa",
    base: "despesa_indireta",
    base_calculo_descricao: "Sobre despesas de frete anuais",
    pct_pessimista: 0.004,
    pct_base: 0.012,
    pct_otimista: 0.022,
    aderencia_por_setor: {
      logistica: "alta",
      industria: "alta",
      comercio: "media",
      servicos: "baixa",
      tecnologia: "baixa",
    },
    aderencia_default: "baixa",
    risco_juridico: "medio",
    prazo_meses: 14,
    docs_necessarios: ["CT-e (60 meses)", "SPED Fiscal", "Contratos de transporte"],
  },
  {
    nome: "Créditos ICMS-ST (Substituição Tributária)",
    categoria: "administrativa_retroativa",
    base: "faturamento",
    base_calculo_descricao: "Sobre faturamento sujeito à ST × diferencial de base",
    pct_pessimista: 0.006,
    pct_base: 0.018,
    pct_otimista: 0.035,
    aderencia_por_setor: {
      comercio: "alta",
      industria: "media",
      logistica: "media",
      servicos: "baixa",
      tecnologia: "baixa",
    },
    aderencia_default: "baixa",
    risco_juridico: "medio",
    prazo_meses: 18,
    docs_necessarios: ["NF-e de saída", "SPED Fiscal", "Contratos de fornecimento"],
  },
  {
    nome: "Exclusão ISS da base PIS/COFINS",
    categoria: "judicial_retroativa",
    base: "faturamento",
    base_calculo_descricao: "Aplicável a prestadoras de serviço com ISS destacado",
    pct_pessimista: 0.005,
    pct_base: 0.015,
    pct_otimista: 0.028,
    aderencia_por_setor: {
      servicos: "alta",
      tecnologia: "alta",
      logistica: "media",
      industria: "baixa",
      comercio: "baixa",
    },
    aderencia_default: "baixa",
    risco_juridico: "medio",
    prazo_meses: 24,
    docs_necessarios: ["NFS-e", "SPED Contribuições", "Balancetes", "Contratos de serviço"],
  },
  {
    nome: "IRPJ/CSLL — Correção Selic sobre indébitos",
    categoria: "judicial_retroativa",
    base: "faturamento",
    base_calculo_descricao: "Aplicável a Lucro Real com histórico de repetição",
    pct_pessimista: 0.002,
    pct_base: 0.008,
    pct_otimista: 0.018,
    aderencia_por_setor: {
      industria: "media",
      comercio: "media",
      logistica: "media",
      servicos: "media",
      tecnologia: "media",
    },
    aderencia_default: "baixa",
    risco_juridico: "alto",
    prazo_meses: 30,
    docs_necessarios: ["LALUR", "ECF", "Processos anteriores de repetição", "Balancetes"],
  },
  {
    nome: "Depreciação/Amortização acelerada",
    categoria: "administrativa_recorrente",
    base: "faturamento",
    base_calculo_descricao: "Sobre bens do ativo imobilizado — aplicável a Lucro Real",
    pct_pessimista: 0.001,
    pct_base: 0.005,
    pct_otimista: 0.012,
    aderencia_por_setor: {
      industria: "media",
      logistica: "media",
      comercio: "baixa",
      servicos: "baixa",
      tecnologia: "baixa",
    },
    aderencia_default: "baixa",
    risco_juridico: "baixo",
    prazo_meses: 6,
    docs_necessarios: ["Registro de ativos", "ECF", "Laudos técnicos"],
  },
];

/**
 * Filtra teses aplicáveis ao setor+regime, com adjust de aderência default
 * quando não há match específico.
 */
export function tesesParaSetor(setor: SetorKey, regime: "real" | "presumido") {
  return TESES_CATALOG.filter((t) => {
    // IRPJ/CSLL Selic só aplica a Lucro Real
    if (t.nome.startsWith("IRPJ/CSLL") && regime !== "real") return false;
    // Depreciação só faz sentido em Real
    if (t.nome.startsWith("Depreciação") && regime !== "real") return false;
    return true;
  }).map((t) => ({
    ...t,
    aderencia_efetiva: t.aderencia_por_setor[setor] || t.aderencia_default,
  }));
}
