"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  RotateCcw,
  Building2,
  AlertTriangle,
  Briefcase,
  Sparkles,
  Info,
} from "lucide-react";
import { DonutChart } from "./donut-chart";
import { SectorComparison } from "./sector-comparison";
import { ScoreGauge } from "./score-gauge";
import { TimelineRetroativa } from "./timeline-retroativa";
import { DisclaimerCard } from "./disclaimer-card";
import { ScenarioCards } from "./scenario-cards";
import { FinancialDashboard } from "./financial-dashboard";
import { TesesDetalhadas } from "./teses-detalhadas";
import { StrongDisclaimer } from "./strong-disclaimer";
import { getSectorBenchmark } from "@/lib/cnpj/sector-benchmarks";
import type { CnpjResponse } from "@/lib/validation/cnpj";
import type { SimulacaoV2 } from "@/lib/simulador/types";

const PERFIL_LABEL: Record<string, string> = {
  lucro_real: "Lucro Real",
  lucro_presumido: "Lucro Presumido",
  simples: "Simples Nacional",
  inconclusivo: "Inconclusivo",
};

const COMPLEX_LABEL: Record<string, string> = {
  baixa: "Baixa complexidade",
  media: "Complexidade moderada",
  alta: "Alta complexidade",
};

const COMPLEX_COLOR: Record<string, string> = {
  baixa: "text-emerald-700 border-emerald-200 bg-emerald-50",
  media: "text-amber-700 border-amber-200 bg-amber-50",
  alta: "text-rose-700 border-rose-200 bg-rose-50",
};

const CONFIAB_LABEL: Record<string, string> = {
  baixa: "Baixa (só CNPJ/CNAE)",
  media: "Média (regime + folha)",
  alta: "Alta (SPED/EFD/DCTF)",
};

interface Props {
  simulacao: SimulacaoV2;
  faturamento: number;
  setor: string;
  cnpjData: (CnpjResponse & { analise_debug?: string }) | null;
  onReset: () => void;
}

export function ResultExtended({
  simulacao,
  faturamento,
  setor,
  cnpjData,
  onReset,
}: Props) {
  const benchmark = getSectorBenchmark(setor);
  const analise = cnpjData?.analise;
  const cenarioBase = simulacao.cenarios.base;
  const janelaMeses = Math.round(simulacao.janela_anos * 12);
  const empresaJovem = simulacao.janela_anos < 4.5;
  const score = analise?.score_aderencia ?? 60;

  // Segments do donut baseado no cenário BASE — 4 categorias
  const donutSegments = (() => {
    const somaPor = (cat: string) =>
      simulacao.teses
        .filter((t) => t.categoria === cat)
        .reduce((s, t) => s + t.valor_base, 0);
    return [
      { label: "Adm · Retroativa", value: somaPor("administrativa_retroativa"), color: "#163A8A" },
      { label: "Adm · Recorrente", value: somaPor("administrativa_recorrente"), color: "#8FA8D6" },
      { label: "Judicial · Retroativa", value: somaPor("judicial_retroativa"), color: "#8C6F3F" },
      { label: "Judicial · Recorrente", value: somaPor("judicial_recorrente"), color: "#5D4A2A" },
    ].filter((s) => s.value > 0);
  })();

  const empresaPct = (cenarioBase.total_final / simulacao.janela_anos / faturamento) * 100;

  return (
    <motion.div
      key="step6-result"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-12 lg:space-y-16"
    >
      {/* Header */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-4">
          ✦ Análise preliminar · janela efetiva {janelaMeses} meses
        </div>
        <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight max-w-4xl">
          Potencial teórico de recuperação
          <br />
          <span className="italic text-[color:var(--color-brand)]">
            em três cenários.
          </span>
        </h2>
      </div>

      {/* Disclaimer forte primeiro */}
      <StrongDisclaimer />

      {/* Empresa jovem */}
      {empresaJovem && cnpjData?.empresa?.data_abertura && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border border-amber-200 bg-amber-50 p-5 lg:p-6 flex flex-col md:flex-row gap-4 md:items-center"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            Janela reduzida
          </div>
          <p className="text-[13px] leading-relaxed text-amber-900 flex-1">
            <strong>Empresa aberta em {cnpjData.empresa.data_abertura}.</strong> A
            janela efetiva de retroatividade é de aproximadamente{" "}
            <strong>{janelaMeses} meses</strong>. Todos os cenários abaixo já
            consideram essa limitação cronológica.
          </p>
        </motion.div>
      )}

      {/* Alerta agressivo — cenário > 30% faturamento anual */}
      {simulacao.alerta_agressivo && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border border-rose-200 bg-rose-50 p-5 lg:p-6 flex gap-4"
        >
          <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
          <div className="text-[13px] leading-relaxed text-rose-900">
            <strong>Estimativa agressiva.</strong> O cenário base ultrapassa 30% do
            faturamento anual da empresa. Isso é atípico e exige validação
            documental aprofundada — SPED, DCTF, balancetes auditados.
          </div>
        </motion.div>
      )}

      {/* Confiabilidade */}
      <div className="flex items-center gap-3 text-[12px] text-[color:var(--color-ink-muted)]">
        <Info className="w-4 h-4 text-[color:var(--color-brand)]" />
        Confiabilidade da estimativa:{" "}
        <strong className="text-[color:var(--color-ink)]">
          {CONFIAB_LABEL[simulacao.confiabilidade]}
        </strong>
      </div>

      {/* CENÁRIOS */}
      <ScenarioCards simulacao={simulacao} />

      {/* Dashboard financeiro do cenário BASE */}
      <FinancialDashboard cenario={cenarioBase} />

      {/* Disclaimer institucional (mais suave, complementar) */}
      <DisclaimerCard setor={benchmark.setor} />

      {/* Donut + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-stretch">
        <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-6 lg:p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
            Composição do cenário base
          </div>
          <h4 className="font-serif text-xl lg:text-2xl text-[color:var(--color-ink)] mb-1">
            Onde os créditos se concentram
          </h4>
          <p className="text-[12px] text-[color:var(--color-ink-muted)] mb-8">
            Por categoria de tese
          </p>
          {donutSegments.length > 0 ? (
            <DonutChart segments={donutSegments} total={cenarioBase.total_ajustado} />
          ) : (
            <p className="text-[13px] text-[color:var(--color-ink-muted)]">
              Sem teses aderentes o suficiente para exibir composição.
            </p>
          )}
        </div>
        <ScoreGauge score={score} />
      </div>

      {/* Comparativo + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SectorComparison
          empresaPct={empresaPct}
          setorPct={benchmark.recuperacao_media_pct}
          setorLabel={benchmark.setor}
        />
        <TimelineRetroativa
          prazoMeses={cenarioBase.prazo_estimado_meses}
          janelaMeses={janelaMeses}
        />
      </div>

      {/* Teses detalhadas — accordion */}
      <TesesDetalhadas teses={simulacao.teses} />

      {/* Análise IA (se houver) */}
      {analise && cnpjData && (
        <div className="space-y-10 pt-4">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)]">
            <Sparkles className="w-3.5 h-3.5" />
            Análise técnica · {cnpjData.empresa.razao_social || "Empresa"}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
            <div className="bg-[color:var(--color-background)] p-6 lg:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-3 flex items-center gap-2">
                <Building2 className="w-3 h-3" />
                Perfil provável
              </div>
              <div className="font-serif text-2xl lg:text-3xl text-[color:var(--color-brand)] tracking-tight mb-3">
                {PERFIL_LABEL[analise.perfil_tributario] || analise.perfil_tributario}
              </div>
              <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                {analise.justificativa_perfil}
              </p>
            </div>

            <div className="bg-[color:var(--color-background)] p-6 lg:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-3 flex items-center gap-2">
                <Briefcase className="w-3 h-3" />
                Complexidade técnica
              </div>
              <div className="mb-3">
                <span
                  className={`inline-block px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border ${
                    COMPLEX_COLOR[analise.complexidade] || ""
                  }`}
                >
                  {COMPLEX_LABEL[analise.complexidade] || analise.complexidade}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                Prazo estimado até primeira recuperação:{" "}
                <strong className="text-[color:var(--color-ink)]">
                  ~{analise.prazo_estimado_meses} meses
                </strong>
                .
              </p>
            </div>

            <div className="bg-[color:var(--color-background)] p-6 lg:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Cenário setorial
              </div>
              <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                {analise.cenario_setorial}
              </p>
            </div>
          </div>

          {analise.riscos.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pontos de atenção
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                {analise.riscos.map((r, i) => (
                  <div key={i} className="bg-[color:var(--color-background)] p-5 lg:p-6">
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-700 mb-2">
                      {r.ponto}
                    </div>
                    <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                      {r.descricao}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-12 grain">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand-soft)] mb-4">
              Próxima ação sugerida
            </div>
            <p className="font-serif text-2xl lg:text-3xl leading-[1.3] text-[color:var(--color-paper)] max-w-3xl">
              {analise.proxima_acao}
            </p>
          </div>
        </div>
      )}

      {cnpjData && !analise && (
        <div className="p-6 border border-amber-200 bg-amber-50 text-[13px] text-amber-900 leading-relaxed space-y-2">
          <p>
            <strong>Análise IA indisponível.</strong> Os dados públicos da empresa
            carregaram, mas a análise tributária automática não pôde ser gerada
            agora.
          </p>
          {(cnpjData as CnpjResponse & { analise_debug?: string }).analise_debug && (
            <p className="font-mono text-[11px] text-amber-700 break-all border-t border-amber-200 pt-2 mt-2">
              <strong>Debug:</strong>{" "}
              {(cnpjData as CnpjResponse & { analise_debug?: string }).analise_debug}
            </p>
          )}
        </div>
      )}

      {/* CTAs finais */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Link
          href="/contato"
          className="group inline-flex items-center justify-center gap-2 px-8 py-5 bg-[color:var(--color-brand)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(30,58,138,0.5)]"
        >
          Agendar diagnóstico técnico
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <button
          onClick={onReset}
          className="group inline-flex items-center justify-center gap-2 px-8 py-5 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Simular outro cenário
        </button>
      </div>
    </motion.div>
  );
}
