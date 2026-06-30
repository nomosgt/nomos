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
} from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { DonutChart } from "./donut-chart";
import { SectorComparison } from "./sector-comparison";
import { ScoreGauge } from "./score-gauge";
import { TimelineRetroativa } from "./timeline-retroativa";
import { DisclaimerCard } from "./disclaimer-card";
import { TesesBars } from "./teses-bars";
import { getSectorBenchmark } from "@/lib/cnpj/sector-benchmarks";
import type { CnpjResponse } from "@/lib/validation/cnpj";

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

interface Props {
  total: number;
  segments: { label: string; value: number; color: string }[];
  faturamento: number;
  setor: string;
  cnpjData: (CnpjResponse & { analise_debug?: string }) | null;
  janelaAnos: number;
  onReset: () => void;
}

export function ResultExtended({
  total,
  segments,
  faturamento,
  setor,
  cnpjData,
  janelaAnos,
  onReset,
}: Props) {
  const empresaPct = (total / janelaAnos / faturamento) * 100; // recuperação anualizada
  const benchmark = getSectorBenchmark(setor);
  const analise = cnpjData?.analise;
  const prazoMeses = analise?.prazo_estimado_meses || benchmark.prazo_medio_meses;
  const score = analise?.score_aderencia ?? 65;
  const janelaMeses = Math.round(janelaAnos * 12);
  const empresaJovem = janelaAnos < 4.5;

  return (
    <motion.div
      key="step6-result"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-12 lg:space-y-16"
    >
      {/* Header + big number */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
          ✦ Estimativa preliminar
        </div>
        <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-4xl">
          Potencial estimado de recuperação:
        </h2>

        <div className="mt-10 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-16 grain relative overflow-hidden">
          {/* Linhas radiais */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-[5%] opacity-[0.07]">
            <svg className="w-[800px] h-[800px]" viewBox="0 0 800 800" fill="none" aria-hidden>
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <line
                  key={deg}
                  x1="400"
                  y1="400"
                  x2={400 + Math.cos((deg * Math.PI) / 180) * 400}
                  y2={400 + Math.sin((deg * Math.PI) / 180) * 400}
                  stroke="var(--color-paper)"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>

          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/50 mb-3">
              Valor estimado · janela efetiva {janelaMeses} meses
            </div>
            <div className="font-mono text-[clamp(3rem,12vw,9rem)] tracking-[-0.05em] leading-[0.9]">
              <span className="text-[color:var(--color-paper)]/60 text-[0.4em] mr-2 align-top">
                R$
              </span>
              <CountUp to={total} duration={2.4} separator="." />
            </div>
          </div>
        </div>
      </div>

      {/* Aviso de empresa jovem — janela reduzida */}
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
            <strong>Empresa aberta em {cnpjData.empresa.data_abertura}.</strong>{" "}
            A janela efetiva de retroatividade é de aproximadamente{" "}
            <strong>{janelaMeses} meses</strong> (não os 60 meses máximos
            permitidos por lei). A estimativa abaixo já considera essa limitação
            cronológica.
          </p>
        </motion.div>
      )}

      {/* Disclaimer institucional */}
      <DisclaimerCard setor={benchmark.setor} />

      {/* Donut breakdown + Score gauge side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-stretch">
        <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-6 lg:p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
            Composição estimada
          </div>
          <h4 className="font-serif text-xl lg:text-2xl text-[color:var(--color-ink)] mb-1">
            Como o total se distribui
          </h4>
          <p className="text-[12px] text-[color:var(--color-ink-muted)] mb-8">
            Por categoria de tese tributária
          </p>
          <DonutChart segments={segments} total={total} />
        </div>

        <ScoreGauge score={score} />
      </div>

      {/* Sector comparison + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SectorComparison
          empresaPct={empresaPct}
          setorPct={benchmark.recuperacao_media_pct}
          setorLabel={benchmark.setor}
        />
        <TimelineRetroativa prazoMeses={prazoMeses} janelaMeses={janelaMeses} />
      </div>

      {/* Análise IA */}
      {analise && cnpjData && (
        <div className="space-y-10 pt-4">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)]">
            <Sparkles className="w-3.5 h-3.5" />
            Análise técnica · {cnpjData.empresa.razao_social || "Empresa"}
          </div>

          {/* Perfil + cenário setorial em grid */}
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
                Estimativa de prazo até a primeira recuperação:{" "}
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

          {/* Teses como barras */}
          {analise.oportunidades.length > 0 && (
            <TesesBars teses={analise.oportunidades} />
          )}

          {/* Riscos */}
          {analise.riscos.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pontos de atenção
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                {analise.riscos.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-[color:var(--color-background)] p-5 lg:p-6"
                  >
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-700 mb-2">
                      {r.ponto}
                    </div>
                    <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                      {r.descricao}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Próxima ação */}
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
          Agendar diagnostico tecnico
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <button
          onClick={onReset}
          className="group inline-flex items-center justify-center gap-2 px-8 py-5 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Simular outro cenario
        </button>
      </div>
    </motion.div>
  );
}
