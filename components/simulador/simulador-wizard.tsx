"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/section";
import { formatBRL } from "@/lib/utils";
import { CountUp } from "@/components/motion/count-up";

type Setor = "industria" | "comercio" | "servicos" | "logistica" | "tecnologia" | "outros";
type Regime = "presumido" | "real";

const SETORES: { value: Setor; label: string }[] = [
  { value: "industria", label: "Indústria" },
  { value: "comercio", label: "Comércio" },
  { value: "servicos", label: "Serviços" },
  { value: "logistica", label: "Logística" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "outros", label: "Outros" },
];

const REGIMES: { value: Regime; label: string }[] = [
  { value: "presumido", label: "Lucro Presumido" },
  { value: "real", label: "Lucro Real" },
];

const MIN = 1_000_000;
const MAX = 500_000_000;

const MIN_DI = 100_000;
const MAX_DI = 200_000_000;

/**
 * Cálculo de potencial conforme planilha oficial NGT.
 * Janela: 5 anos de retroatividade.
 *
 * Lucro Real:
 *   Judiciais       = (8% × RB + 3% × RB) × 5
 *   Administrativas = (8% × RB + 15% × DI + 3% × RB) × 5
 *
 * Lucro Presumido:
 *   Judiciais       = (8% × RB + 3% × RB) × 5
 *   Administrativas = (15% × DI) × 5
 *
 * Adicional Comércio (qualquer regime):
 *   Créditos ICMS Comércio = (15% × DI) × 5
 */
function calcular(rb: number, di: number, setor: Setor, regime: Regime) {
  const segments: { label: string; value: number; color: string; description: string }[] = [];

  // Tese Judicial (mesma fórmula para Real e Presumido)
  const judicial = Math.round((0.08 * rb + 0.03 * rb) * 5);
  segments.push({
    label: "Tese Judicial",
    value: judicial,
    color: "var(--color-brand)",
    description: "",
  });

  // Tese Administrativa
  const administrativa =
    regime === "real"
      ? Math.round((0.08 * rb + 0.15 * di + 0.03 * rb) * 5)
      : Math.round(0.15 * di * 5);
  segments.push({
    label: "Tese Administrativa",
    value: administrativa,
    color: "var(--color-brand-soft)",
    description: "",
  });

  // Adicional ICMS Comércio (só setor comércio)
  if (setor === "comercio") {
    const icmsComercio = Math.round(0.15 * di * 5);
    segments.push({
      label: "Créditos ICMS — Comércio",
      value: icmsComercio,
      color: "var(--color-brand-dim)",
      description: "",
    });
  }

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return { total, segments, regime };
}

function valueToSlider(value: number) {
  // Log scale
  return (Math.log10(value) - Math.log10(MIN)) / (Math.log10(MAX) - Math.log10(MIN));
}
function sliderToValue(t: number) {
  const v = Math.pow(10, Math.log10(MIN) + t * (Math.log10(MAX) - Math.log10(MIN)));
  // Round to nice number
  if (v >= 100_000_000) return Math.round(v / 5_000_000) * 5_000_000;
  if (v >= 10_000_000) return Math.round(v / 500_000) * 500_000;
  if (v >= 1_000_000) return Math.round(v / 100_000) * 100_000;
  return Math.round(v / 10_000) * 10_000;
}

export function SimuladorWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [faturamento, setFaturamento] = useState(10_000_000);
  const [despesa, setDespesa] = useState(3_000_000);
  const [setor, setSetor] = useState<Setor | null>(null);
  const [regime, setRegime] = useState<Regime | null>(null);

  const result = useMemo(() => {
    if (!setor || !regime) return null;
    return calcular(faturamento, despesa, setor, regime);
  }, [faturamento, despesa, setor, regime]);

  const canNext =
    step === 1 ||
    step === 2 ||
    (step === 3 && !!setor) ||
    (step === 4 && !!regime);

  const reset = () => {
    setStep(1);
    setFaturamento(10_000_000);
    setDespesa(3_000_000);
    setSetor(null);
    setRegime(null);
    savedRef.current = null;
  };

  // Salva a simulação no backend exatamente UMA vez por resultado.
  // Idempotente: se o user volta e muda inputs, gera nova key e re-salva.
  const savedRef = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 5 || !result || !setor || !regime) return;
    const key = `${faturamento}|${despesa}|${setor}|${regime}`;
    if (savedRef.current === key) return;
    savedRef.current = key;

    fetch("/api/simulador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        faturamento,
        despesa_indireta: despesa,
        setor,
        regime,
        tese_judicial:
          result.segments.find((s) => s.label === "Tese Judicial")?.value ?? 0,
        tese_administrativa:
          result.segments.find((s) => s.label === "Tese Administrativa")
            ?.value ?? 0,
        icms_comercio:
          result.segments.find((s) => s.label.includes("ICMS"))?.value ?? 0,
        total: result.total,
      }),
    }).catch((err) => {
      // Falha silenciosa — UX não depende disso.
      console.warn("[simulador] falha ao registrar:", err);
    });
  }, [step, result, faturamento, despesa, setor, regime]);

  return (
    <section className="pb-32 lg:pb-44 border-t border-[color:var(--color-hairline)]">
      <Container>
        {/* Progress bar — 4 etapas + resultado */}
        <div className="pt-10 lg:pt-16 mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
              Etapa {step === 5 ? 4 : step} de 4
            </div>
            {step > 1 && (
              <button
                onClick={reset}
                className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-brand)] transition-colors"
              >
                <RotateCcw className="w-3 h-3 transition-transform group-hover:-rotate-45" />
                Recomeçar
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((s) => {
              const current = step === 5 ? 5 : step;
              return (
                <div
                  key={s}
                  className={`h-px transition-colors duration-500 ${
                    current > s
                      ? "bg-[color:var(--color-brand)]"
                      : current === s
                      ? "bg-[color:var(--color-ink)]"
                      : "bg-[color:var(--color-hairline)]"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[480px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 01
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  Qual o faturamento anual<br />
                  estimado da empresa?
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-16">
                  Pode ser uma estimativa aproximada — usamos só para calibrar a
                  faixa de recuperação.
                </p>

                <div className="border border-[color:var(--color-hairline)] p-8 lg:p-12">
                  <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-3">
                    Faturamento anual
                  </div>
                  <div className="font-mono text-5xl lg:text-7xl tracking-tighter text-[color:var(--color-ink)] mb-10">
                    {formatBRL(faturamento)}
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={valueToSlider(faturamento) * 1000}
                    onChange={(e) => setFaturamento(sliderToValue(Number(e.target.value) / 1000))}
                    className="w-full h-1 appearance-none bg-[color:var(--color-hairline)] cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:bg-[color:var(--color-ink)]
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110
                      [&::-moz-range-thumb]:appearance-none
                      [&::-moz-range-thumb]:w-5
                      [&::-moz-range-thumb]:h-5
                      [&::-moz-range-thumb]:bg-[color:var(--color-ink)]
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:border-0"
                  />

                  <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                    <span>R$ 1M</span>
                    <span>R$ 500M</span>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-2">
                    {[5_000_000, 25_000_000, 100_000_000, 250_000_000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setFaturamento(preset)}
                        className="px-4 py-2 border border-[color:var(--color-hairline)] font-mono text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)] transition-colors"
                      >
                        {formatBRL(preset, { compact: true })}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2-despesa"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 02
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  E a despesa indireta<br />
                  anual da operação?
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-16">
                  Insumos, energia, manutenção, frete, prestadores — tudo que
                  entra na operação sem ser custo direto de produto. É a base
                  pros créditos administrativos de PIS/COFINS e ICMS.
                </p>

                <div className="border border-[color:var(--color-hairline)] p-8 lg:p-12">
                  <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-3">
                    Despesa indireta anual
                  </div>
                  <div className="font-mono text-5xl lg:text-7xl tracking-tighter text-[color:var(--color-ink)] mb-10">
                    {formatBRL(despesa)}
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={
                      ((Math.log10(despesa) - Math.log10(MIN_DI)) /
                        (Math.log10(MAX_DI) - Math.log10(MIN_DI))) *
                      1000
                    }
                    onChange={(e) => {
                      const t = Number(e.target.value) / 1000;
                      const v = Math.pow(
                        10,
                        Math.log10(MIN_DI) +
                          t * (Math.log10(MAX_DI) - Math.log10(MIN_DI)),
                      );
                      const rounded =
                        v >= 50_000_000
                          ? Math.round(v / 1_000_000) * 1_000_000
                          : v >= 5_000_000
                          ? Math.round(v / 250_000) * 250_000
                          : v >= 500_000
                          ? Math.round(v / 50_000) * 50_000
                          : Math.round(v / 10_000) * 10_000;
                      setDespesa(rounded);
                    }}
                    className="w-full h-1 appearance-none bg-[color:var(--color-hairline)] cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:bg-[color:var(--color-ink)]
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110
                      [&::-moz-range-thumb]:appearance-none
                      [&::-moz-range-thumb]:w-5
                      [&::-moz-range-thumb]:h-5
                      [&::-moz-range-thumb]:bg-[color:var(--color-ink)]
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:border-0"
                  />

                  <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                    <span>R$ 100k</span>
                    <span>R$ 200M</span>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-2">
                    {[500_000, 2_000_000, 10_000_000, 50_000_000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setDespesa(preset)}
                        className="px-4 py-2 border border-[color:var(--color-hairline)] font-mono text-[11px] uppercase tracking-[0.15em] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)] transition-colors"
                      >
                        {formatBRL(preset, { compact: true })}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 text-[12px] text-[color:var(--color-ink-faint)] leading-relaxed">
                    Em geral entre 20% e 50% da receita bruta. Sem certeza?
                    Estime ~30%.
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3-setor"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 03
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  Em qual setor a empresa atua?
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-16">
                  Cada setor tem perfil tributário diferente — e portanto
                  potencial diferente de créditos a recuperar.
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                  {SETORES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSetor(s.value)}
                      className={`group bg-[color:var(--color-background)] p-6 lg:p-8 text-left transition-all duration-300 ${
                        setor === s.value
                          ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                          : "hover:bg-[color:var(--color-surface)]"
                      }`}
                    >
                      <div
                        className={`font-mono text-[10px] uppercase tracking-[0.3em] mb-8 ${
                          setor === s.value
                            ? "text-[color:var(--color-brand-soft)]"
                            : "text-[color:var(--color-ink-faint)]"
                        }`}
                      >
                        ◇ Setor
                      </div>
                      <div className="font-serif text-2xl lg:text-3xl tracking-tight">
                        {s.label}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4-regime"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 04
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  E o regime tributário atual?
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-16">
                  O regime define quais tributos incidem e, portanto, quais
                  créditos podem ser recuperados.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                  {REGIMES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRegime(r.value)}
                      className={`group bg-[color:var(--color-background)] p-8 lg:p-10 text-left transition-all duration-300 ${
                        regime === r.value
                          ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                          : "hover:bg-[color:var(--color-surface)]"
                      }`}
                    >
                      <div
                        className={`font-mono text-[10px] uppercase tracking-[0.3em] mb-8 ${
                          regime === r.value
                            ? "text-[color:var(--color-brand-soft)]"
                            : "text-[color:var(--color-ink-faint)]"
                        }`}
                      >
                        ◇ Regime
                      </div>
                      <div className="font-serif text-2xl lg:text-3xl tracking-tight">
                        {r.label}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && result && (
              <motion.div
                key="step5-result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  ✦ Estimativa preliminar
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-4xl">
                  Potencial estimado de recuperação:
                </h2>

                {/* Número grande, sem composição, sem explicação — desperta curiosidade */}
                <div className="mt-10 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-16 grain relative overflow-hidden">
                  {/* Linhas decorativas radiando atrás */}
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
                      Valor estimado · janela retroativa
                    </div>
                    <div className="font-mono text-[clamp(3rem,12vw,9rem)] tracking-[-0.05em] leading-[0.9]">
                      <span className="text-[color:var(--color-paper)]/60 text-[0.4em] mr-2 align-top">R$</span>
                      <CountUp to={result.total} duration={2.4} separator="." />
                    </div>

                    <div className="mt-12 pt-10 border-t border-[color:var(--color-paper)]/15">
                      <p className="font-serif text-2xl lg:text-3xl leading-[1.3] text-[color:var(--color-paper)]/90 max-w-2xl italic">
                        Quer entender de onde vem esse número?
                      </p>
                      <p className="mt-4 text-[14px] text-[color:var(--color-paper)]/55 max-w-xl leading-relaxed">
                        Cada empresa tem uma combinação única de teses aplicáveis. Em
                        uma conversa rápida, mostramos exatamente o que se aplica ao
                        seu caso — sem custo, sem compromisso.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contato"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-5 bg-[color:var(--color-brand)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(30,58,138,0.5)]"
                  >
                    Quero entender meu potencial
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                  <button
                    onClick={reset}
                    className="group inline-flex items-center justify-center gap-2 px-8 py-5 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Simular outro cenário
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {step < 5 && (
          <div className="mt-16 flex items-center justify-between pt-8 border-t border-[color:var(--color-hairline)]">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5)}
              disabled={step === 1}
              className="group inline-flex items-center gap-2 px-5 py-3 text-[13px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Voltar
            </button>
            <button
              onClick={() => setStep((s) => Math.min(5, s + 1) as 1 | 2 | 3 | 4 | 5)}
              disabled={!canNext}
              className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none"
            >
              {step === 4 ? "Simular potencial" : "Próxima"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </Container>
    </section>
  );
}
// end of SimuladorWizard
