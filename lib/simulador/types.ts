/**
 * Tipos do Simulador v2 — 3 cenários com travas e detalhamento por tese.
 */

export type Cenario = "pessimista" | "base" | "otimista";

export type Aderencia = "alta" | "media" | "baixa";
export type RiscoJuridico = "baixo" | "medio" | "alto";
export type CategoriaTese =
  | "administrativa_recorrente"
  | "administrativa_retroativa"
  | "judicial_recorrente"
  | "judicial_retroativa";

export type Confiabilidade = "baixa" | "media" | "alta";

export interface TeseDetalhada {
  nome: string;
  categoria: CategoriaTese;
  base_calculo_descricao: string;
  percentual_pct: number;
  aderencia: Aderencia;
  risco_juridico: RiscoJuridico;
  prazo_meses: number;
  docs_necessarios: string[];
  valor_pessimista: number;
  valor_base: number;
  valor_otimista: number;
}

export interface RedutorAplicado {
  nome: string;
  reducao_pct: number;
}

export interface CenarioResult {
  nome: Cenario;
  total_bruto: number;
  redutores: RedutorAplicado[];
  total_ajustado: number;
  cap_pct: number;
  cap_aplicado: boolean;
  total_final: number;
  honorarios_pct: number;
  valor_liquido_cliente: number;
  prazo_estimado_meses: number;
}

export interface SimulacaoV2 {
  cenarios: {
    pessimista: CenarioResult;
    base: CenarioResult;
    otimista: CenarioResult;
  };
  teses: TeseDetalhada[];
  confiabilidade: Confiabilidade;
  alerta_agressivo: boolean;
  janela_anos: number;
  faturamento_60m: number;
}
