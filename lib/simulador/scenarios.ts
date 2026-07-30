/**
 * Calcula 3 cenários (pessimista/base/otimista) com travas, redutores e teses detalhadas.
 */

import type {
  Cenario,
  CenarioResult,
  Confiabilidade,
  RedutorAplicado,
  SimulacaoV2,
  TeseDetalhada,
} from "./types";
import { tesesParaSetor, type SetorKey } from "./teses-catalog";

// ============================================================
// TRAVAS por cenário — % máximo do faturamento acumulado 60m
// ============================================================
const CAPS_PCT: Record<Cenario, number> = {
  pessimista: 0.035, // 3.5% do faturamento acumulado
  base: 0.085, // 8.5%
  otimista: 0.185, // 18.5%
};

// ============================================================
// REDUTORES por doc faltante — aplicados no free simulator
// (todas as docs são "faltantes" já que só temos CNPJ+CNAE)
// ============================================================
const REDUTORES = {
  sem_sped_efd: 0.4, // -40%
  sem_xmls_nfs: 0.3, // -30%
  sem_balancetes: 0.2, // -20%
  sem_regime_confirmado: 0.25, // -25%
};

const HONORARIOS_PCT_DEFAULT = 0.3; // 30% de honorários advocatícios sobre valor recuperado

/**
 * Score de confiabilidade — inferido a partir do que o usuario forneceu.
 * No free simulator, sempre "baixa" — só temos CNPJ/CNAE/faturamento estimado.
 */
export function inferirConfiabilidade(opts: {
  temCnpj: boolean;
  temRegimeConfirmado: boolean;
  temSPED?: boolean;
  temXMLs?: boolean;
}): Confiabilidade {
  if (opts.temSPED) return "alta";
  if (opts.temRegimeConfirmado && opts.temXMLs) return "media";
  if (opts.temRegimeConfirmado) return "media";
  return "baixa";
}

/**
 * Calcula os 3 cenários completos.
 *
 * @param rb Receita bruta anual
 * @param di Despesa indireta anual
 * @param setor Setor (para escolher aderência)
 * @param regime Regime tributário
 * @param janelaAnos Idade da empresa (max 5)
 * @param confiabilidade Score de confiabilidade dos inputs
 */
export function calcularSimulacaoV2(opts: {
  rb: number;
  di: number;
  setor: SetorKey;
  regime: "real" | "presumido";
  janelaAnos: number;
  confiabilidade: Confiabilidade;
}): SimulacaoV2 {
  const { rb, di, setor, regime, janelaAnos, confiabilidade } = opts;
  const faturamento_60m = rb * janelaAnos;

  const teses = tesesParaSetor(setor, regime);

  // ============================================================
  // Fator de aderência: alta=1.0, media=0.6, baixa=0.25
  // ============================================================
  const aderenciaFactor = (a: "alta" | "media" | "baixa") =>
    a === "alta" ? 1.0 : a === "media" ? 0.6 : 0.25;

  // ============================================================
  // Cálculo bruto por tese (sem redutores)
  // ============================================================
  const tesesDetalhadas: TeseDetalhada[] = teses.map((t) => {
    const baseValor =
      t.base === "faturamento"
        ? rb
        : t.base === "despesa_indireta"
        ? di
        : rb + di;

    const factor = aderenciaFactor(t.aderencia_efetiva);
    const pessimista = Math.round(
      baseValor * t.pct_pessimista * factor * janelaAnos,
    );
    const base = Math.round(baseValor * t.pct_base * factor * janelaAnos);
    const otimista = Math.round(
      baseValor * t.pct_otimista * factor * janelaAnos,
    );

    return {
      nome: t.nome,
      categoria: t.categoria,
      base_calculo_descricao: t.base_calculo_descricao,
      percentual_pct: t.pct_base * 100,
      aderencia: t.aderencia_efetiva,
      risco_juridico: t.risco_juridico,
      prazo_meses: t.prazo_meses,
      docs_necessarios: t.docs_necessarios,
      valor_pessimista: pessimista,
      valor_base: base,
      valor_otimista: otimista,
    };
  });

  // ============================================================
  // Redutores por doc faltante — na confiabilidade baixa aplica tudo
  // ============================================================
  const redutoresAplicados: RedutorAplicado[] = [];
  let fatorReducao = 1.0;

  if (confiabilidade === "baixa") {
    redutoresAplicados.push(
      { nome: "Sem SPED/EFD", reducao_pct: REDUTORES.sem_sped_efd * 100 },
      { nome: "Sem XMLs/NFs", reducao_pct: REDUTORES.sem_xmls_nfs * 100 },
      { nome: "Sem balancetes", reducao_pct: REDUTORES.sem_balancetes * 100 },
      {
        nome: "Regime não confirmado",
        reducao_pct: REDUTORES.sem_regime_confirmado * 100,
      },
    );
    // Multiplicativo com piso de 25% (não reduz mais que 75%)
    fatorReducao = Math.max(
      0.25,
      (1 - REDUTORES.sem_sped_efd) *
        (1 - REDUTORES.sem_xmls_nfs) *
        (1 - REDUTORES.sem_balancetes) *
        (1 - REDUTORES.sem_regime_confirmado),
    );
  } else if (confiabilidade === "media") {
    redutoresAplicados.push(
      { nome: "Sem SPED completo", reducao_pct: 25 },
      { nome: "Sem balancetes auditados", reducao_pct: 15 },
    );
    fatorReducao = 0.75 * 0.85;
  } else {
    redutoresAplicados.push({ nome: "Ajuste conservador padrão", reducao_pct: 10 });
    fatorReducao = 0.9;
  }

  // ============================================================
  // Monta cenários com cap
  // ============================================================
  function montaCenario(cenario: Cenario): CenarioResult {
    const bruto = tesesDetalhadas.reduce((s, t) => {
      const v =
        cenario === "pessimista"
          ? t.valor_pessimista
          : cenario === "base"
          ? t.valor_base
          : t.valor_otimista;
      return s + v;
    }, 0);

    const ajustado = Math.round(bruto * fatorReducao);
    const capValor = Math.round(CAPS_PCT[cenario] * faturamento_60m);
    const capAplicado = ajustado > capValor;
    const totalFinal = capAplicado ? capValor : ajustado;
    const liquido = Math.round(totalFinal * (1 - HONORARIOS_PCT_DEFAULT));

    // Prazo estimado = média ponderada dos prazos das teses
    const prazoMedio =
      tesesDetalhadas.reduce((s, t) => s + t.prazo_meses, 0) /
      Math.max(1, tesesDetalhadas.length);
    const prazoAjustado =
      cenario === "pessimista"
        ? Math.round(prazoMedio * 1.3)
        : cenario === "base"
        ? Math.round(prazoMedio)
        : Math.round(prazoMedio * 0.8);

    return {
      nome: cenario,
      total_bruto: bruto,
      redutores: redutoresAplicados,
      total_ajustado: ajustado,
      cap_pct: CAPS_PCT[cenario] * 100,
      cap_aplicado: capAplicado,
      total_final: totalFinal,
      honorarios_pct: HONORARIOS_PCT_DEFAULT * 100,
      valor_liquido_cliente: liquido,
      prazo_estimado_meses: prazoAjustado,
    };
  }

  const cenarios = {
    pessimista: montaCenario("pessimista"),
    base: montaCenario("base"),
    otimista: montaCenario("otimista"),
  };

  // ============================================================
  // Alerta agressivo — se cenário BASE > 30% do faturamento anual
  // ============================================================
  const alerta_agressivo = cenarios.base.total_final > rb * 0.3;

  return {
    cenarios,
    teses: tesesDetalhadas,
    confiabilidade,
    alerta_agressivo,
    janela_anos: janelaAnos,
    faturamento_60m,
  };
}

/**
 * Labels amigáveis pra categoria.
 */
export const CATEGORIA_LABEL: Record<string, string> = {
  administrativa_recorrente: "Administrativa · Recorrente",
  administrativa_retroativa: "Administrativa · Retroativa",
  judicial_recorrente: "Judicial · Recorrente",
  judicial_retroativa: "Judicial · Retroativa",
};
