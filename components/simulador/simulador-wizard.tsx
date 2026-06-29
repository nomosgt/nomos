"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  RotateCcw,
  Search,
  Loader2,
  Lock,
  Building2,
  TrendingUp,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Container } from "@/components/ui/section";
import { formatBRL } from "@/lib/utils";
import { CountUp } from "@/components/motion/count-up";
import type { CnpjResponse } from "@/lib/validation/cnpj";

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

const APLICAB_COLOR: Record<string, string> = {
  alta: "text-emerald-700 border-emerald-200 bg-emerald-50",
  media: "text-amber-700 border-amber-200 bg-amber-50",
  baixa: "text-gray-600 border-gray-200 bg-gray-50",
};

const PERFIL_LABEL: Record<string, string> = {
  lucro_real: "Lucro Real",
  lucro_presumido: "Lucro Presumido",
  simples: "Simples Nacional",
  inconclusivo: "Inconclusivo",
};

const MIN = 1_000_000;
const MAX = 500_000_000;
const MIN_DI = 100_000;
const MAX_DI = 200_000_000;

function calcular(rb: number, di: number, setor: Setor, regime: Regime) {
  const segments: { label: string; value: number; color: string; description: string }[] = [];
  const judicial = Math.round((0.08 * rb + 0.03 * rb) * 5);
  segments.push({ label: "Tese Judicial", value: judicial, color: "var(--color-brand)", description: "" });
  const administrativa =
    regime === "real"
      ? Math.round((0.08 * rb + 0.15 * di + 0.03 * rb) * 5)
      : Math.round(0.15 * di * 5);
  segments.push({ label: "Tese Administrativa", value: administrativa, color: "var(--color-brand-soft)", description: "" });
  if (setor === "comercio") {
    const icmsComercio = Math.round(0.15 * di * 5);
    segments.push({ label: "Créditos ICMS — Comércio", value: icmsComercio, color: "var(--color-brand-dim)", description: "" });
  }
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return { total, segments, regime };
}

function valueToSlider(value: number) {
  return (Math.log10(value) - Math.log10(MIN)) / (Math.log10(MAX) - Math.log10(MIN));
}
function sliderToValue(t: number) {
  const v = Math.pow(10, Math.log10(MIN) + t * (Math.log10(MAX) - Math.log10(MIN)));
  if (v >= 100_000_000) return Math.round(v / 5_000_000) * 5_000_000;
  if (v >= 10_000_000) return Math.round(v / 500_000) * 500_000;
  if (v >= 1_000_000) return Math.round(v / 100_000) * 100_000;
  return Math.round(v / 10_000) * 10_000;
}

function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskFone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Inferencia setor a partir do CNAE (primeiros 2 digitos).
 */
function inferirSetor(cnae: string | null): Setor | null {
  if (!cnae) return null;
  const c = cnae.replace(/\D/g, "").slice(0, 2);
  const n = parseInt(c, 10);
  if (isNaN(n)) return null;
  if (n >= 10 && n <= 33) return "industria";
  if (n === 45 || (n >= 46 && n <= 47)) return "comercio";
  if (n >= 49 && n <= 53) return "logistica";
  if (n >= 58 && n <= 63) return "tecnologia";
  if (n >= 64 && n <= 99) return "servicos";
  return "outros";
}

/**
 * Inferencia regime a partir do porte/capital.
 */
function inferirRegime(porte: string | null, capital: number | null): Regime | null {
  if (!porte && !capital) return null;
  if (porte && /demais|grande/i.test(porte)) return "real";
  if (capital && capital >= 5_000_000) return "real";
  return "presumido";
}

export function SimuladorWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1 — CNPJ
  const [cnpj, setCnpj] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjData, setCnpjData] = useState<
    (CnpjResponse & { analise_debug?: string }) | null
  >(null);

  // Steps 2-5 — simulacao
  const [faturamento, setFaturamento] = useState(10_000_000);
  const [despesa, setDespesa] = useState(3_000_000);
  const [setor, setSetor] = useState<Setor | null>(null);
  const [regime, setRegime] = useState<Regime | null>(null);

  // Lead gate
  const [gateOpen, setGateOpen] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadFone, setLeadFone] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSent, setLeadSent] = useState(false);

  const result = useMemo(() => {
    if (!setor || !regime) return null;
    return calcular(faturamento, despesa, setor, regime);
  }, [faturamento, despesa, setor, regime]);

  const canNext =
    (step === 1) || // CNPJ opcional
    step === 2 ||
    step === 3 ||
    (step === 4 && !!setor) ||
    (step === 5 && !!regime);

  const reset = () => {
    setStep(1);
    setCnpj("");
    setCnpjData(null);
    setCnpjError(null);
    setFaturamento(10_000_000);
    setDespesa(3_000_000);
    setSetor(null);
    setRegime(null);
    setGateOpen(false);
    setLeadEmail("");
    setLeadFone("");
    setLeadError(null);
    setLeadSent(false);
    savedRef.current = null;
  };

  async function buscarCnpj() {
    if (cnpj.replace(/\D/g, "").length !== 14) return;
    setCnpjError(null);
    setCnpjLoading(true);
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 32000);
    try {
      const res = await fetch("/api/cnpj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj }),
        signal: ctrl.signal,
      });
      const json = await res.json();
      if (!res.ok) {
        setCnpjError(json.error || `HTTP ${res.status}`);
        return;
      }
      setCnpjData(json as CnpjResponse);
      // Pre-preenche setor/regime quando possivel
      const inferredSetor = inferirSetor(json.empresa?.cnae_principal);
      if (inferredSetor) setSetor(inferredSetor);
      const inferredRegime = inferirRegime(
        json.empresa?.porte,
        json.empresa?.capital_social,
      );
      if (inferredRegime) setRegime(inferredRegime);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      setCnpjError(isAbort ? "Demorou demais. Tenta de novo." : "Erro de conexao.");
    } finally {
      clearTimeout(tid);
      setCnpjLoading(false);
    }
  }

  async function enviarLead() {
    setLeadError(null);
    if (!leadEmail || !leadFone) {
      setLeadError("Preencha email e telefone.");
      return;
    }
    setLeadLoading(true);
    try {
      const res = await fetch("/api/lead-simulador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadEmail,
          telefone: leadFone,
          cnpj: cnpj || null,
          razao_social: cnpjData?.empresa?.razao_social || null,
          faturamento,
          despesa_indireta: despesa,
          setor,
          regime,
          total: result?.total,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLeadError(json.error || "Nao foi possivel enviar.");
        return;
      }
      setLeadSent(true);
      // Fecha modal e avanca pra resultado apos 600ms
      setTimeout(() => {
        setGateOpen(false);
        setStep(6);
      }, 600);
    } catch {
      setLeadError("Erro de conexao. Tente novamente.");
    } finally {
      setLeadLoading(false);
    }
  }

  // Persiste simulacao no backend quando chega no resultado
  const savedRef = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 6 || !result || !setor || !regime) return;
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
          result.segments.find((s) => s.label === "Tese Administrativa")?.value ?? 0,
        icms_comercio:
          result.segments.find((s) => s.label.includes("ICMS"))?.value ?? 0,
        total: result.total,
      }),
    }).catch((err) => console.warn("[simulador] falha ao registrar:", err));
  }, [step, result, faturamento, despesa, setor, regime]);

  return (
    <section className="pb-32 lg:pb-44 border-t border-[color:var(--color-hairline)]">
      <Container>
        {/* Progress bar — 5 etapas + resultado */}
        <div className="pt-10 lg:pt-16 mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
              Etapa {step === 6 ? 5 : step} de 5
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
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((s) => {
              const current = step === 6 ? 6 : step;
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

        <div className="min-h-[480px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1-cnpj"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 01 · Identificação
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  Informe o CNPJ da empresa<br />
                  <span className="italic text-[color:var(--color-brand)]">
                    para análise técnica.
                  </span>
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-10">
                  Usamos só dados públicos (Receita Federal + BrasilAPI) para
                  pré-qualificar a operação e calibrar a estimativa. Opcional,
                  mas recomendado.
                </p>

                <div className="border border-[color:var(--color-hairline)] p-8 lg:p-12">
                  <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-4">
                    CNPJ
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <input
                      type="text"
                      value={cnpj}
                      onChange={(e) => {
                        setCnpj(maskCnpj(e.target.value));
                        setCnpjError(null);
                      }}
                      placeholder="00.000.000/0000-00"
                      inputMode="numeric"
                      disabled={cnpjLoading}
                      className="flex-1 bg-transparent border-b-2 border-[color:var(--color-ink)] pb-3 text-2xl lg:text-3xl font-mono tracking-tight text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={buscarCnpj}
                      disabled={cnpjLoading || cnpj.replace(/\D/g, "").length !== 14}
                      className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {cnpjLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Buscando…
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Buscar
                        </>
                      )}
                    </button>
                  </div>
                  {cnpjError && (
                    <p className="mt-3 text-[12px] text-red-700">{cnpjError}</p>
                  )}

                  {cnpjData && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 pt-6 border-t border-[color:var(--color-hairline)] grid grid-cols-2 lg:grid-cols-4 gap-4 text-[12px]"
                    >
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-1">
                          Razão social
                        </div>
                        <div className="font-medium text-[color:var(--color-ink)]">
                          {cnpjData.empresa.razao_social || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-1">
                          CNAE
                        </div>
                        <div className="font-mono text-[color:var(--color-ink)]">
                          {cnpjData.empresa.cnae_principal || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-1">
                          Porte
                        </div>
                        <div className="text-[color:var(--color-ink)]">
                          {cnpjData.empresa.porte || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-1">
                          Município/UF
                        </div>
                        <div className="text-[color:var(--color-ink)]">
                          {[cnpjData.empresa.municipio, cnpjData.empresa.uf]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <p className="mt-6 text-[12px] text-[color:var(--color-ink-faint)]">
                  Sem CNPJ? Tá tudo bem — pode pular esta etapa. Mas com ele a
                  análise fica muito mais precisa.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2-faturamento"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 02
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
                    className="w-full h-1 appearance-none bg-[color:var(--color-hairline)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[color:var(--color-ink)] [&::-webkit-slider-thumb]:rounded-full"
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

            {step === 3 && (
              <motion.div
                key="step3-despesa"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 03
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  E a despesa indireta<br />
                  anual da operação?
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-16">
                  Insumos, energia, manutenção, frete, prestadores — tudo que
                  entra na operação sem ser custo direto.
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
                    value={((Math.log10(despesa) - Math.log10(MIN_DI)) / (Math.log10(MAX_DI) - Math.log10(MIN_DI))) * 1000}
                    onChange={(e) => {
                      const t = Number(e.target.value) / 1000;
                      const v = Math.pow(10, Math.log10(MIN_DI) + t * (Math.log10(MAX_DI) - Math.log10(MIN_DI)));
                      const rounded =
                        v >= 50_000_000 ? Math.round(v / 1_000_000) * 1_000_000 :
                        v >= 5_000_000 ? Math.round(v / 250_000) * 250_000 :
                        v >= 500_000 ? Math.round(v / 50_000) * 50_000 :
                        Math.round(v / 10_000) * 10_000;
                      setDespesa(rounded);
                    }}
                    className="w-full h-1 appearance-none bg-[color:var(--color-hairline)] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[color:var(--color-ink)] [&::-webkit-slider-thumb]:rounded-full"
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
                    Em geral entre 20% e 50% da receita bruta. Sem certeza? Estime ~30%.
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4-setor"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 04
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  Em qual setor a empresa atua?
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-16">
                  {cnpjData
                    ? "Pré-selecionado a partir do CNAE. Confira e ajuste se necessário."
                    : "Cada setor tem perfil tributário diferente — e potencial diferente de créditos."}
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
                      <div className={`font-mono text-[10px] uppercase tracking-[0.3em] mb-8 ${
                        setor === s.value ? "text-[color:var(--color-brand-soft)]" : "text-[color:var(--color-ink-faint)]"
                      }`}>
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

            {step === 5 && (
              <motion.div
                key="step5-regime"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                  / 05
                </div>
                <h2 className="font-serif text-display-md lg:text-display-lg leading-[0.95] tracking-tight mb-4 max-w-3xl">
                  E o regime tributário atual?
                </h2>
                <p className="text-[16px] text-[color:var(--color-ink-muted)] max-w-xl mb-16">
                  {cnpjData
                    ? "Pré-selecionado a partir do porte/capital social. Ajuste se necessário."
                    : "O regime define quais tributos incidem e, portanto, quais créditos podem ser recuperados."}
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
                      <div className={`font-mono text-[10px] uppercase tracking-[0.3em] mb-8 ${
                        regime === r.value ? "text-[color:var(--color-brand-soft)]" : "text-[color:var(--color-ink-faint)]"
                      }`}>
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

            {step === 6 && result && (
              <motion.div
                key="step6-result"
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

                <div className="mt-10 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-16 grain relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-[5%] opacity-[0.07]">
                    <svg className="w-[800px] h-[800px]" viewBox="0 0 800 800" fill="none" aria-hidden>
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                        <line key={deg} x1="400" y1="400" x2={400 + Math.cos((deg * Math.PI) / 180) * 400} y2={400 + Math.sin((deg * Math.PI) / 180) * 400} stroke="var(--color-paper)" strokeWidth="1" />
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
                  </div>
                </div>

                {/* Analise IA do CNPJ se disponivel */}
                {cnpjData?.analise && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12 space-y-8"
                  >
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" />
                      Análise técnica · {cnpjData.empresa.razao_social || "Empresa"}
                    </div>

                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-3">
                        Perfil tributário provável
                      </div>
                      <div className="font-serif text-3xl lg:text-4xl tracking-tight text-[color:var(--color-brand)] mb-2">
                        {PERFIL_LABEL[cnpjData.analise.perfil_tributario] || cnpjData.analise.perfil_tributario}
                      </div>
                      <p className="text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-2xl">
                        {cnpjData.analise.justificativa_perfil}
                      </p>
                    </div>

                    {cnpjData.analise.oportunidades.length > 0 && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-4 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Teses aplicáveis
                        </div>
                        <div className="space-y-3">
                          {cnpjData.analise.oportunidades.map((o, i) => (
                            <div key={i} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-start p-5 border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]">
                              <div className="md:w-40">
                                <div className="font-serif text-lg text-[color:var(--color-ink)] mb-1">{o.nome}</div>
                                <span className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${APLICAB_COLOR[o.aplicabilidade] || ""}`}>
                                  {o.aplicabilidade}
                                </span>
                              </div>
                              <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)]">
                                {o.justificativa}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cnpjData.analise.riscos.length > 0 && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Pontos de atenção
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                          {cnpjData.analise.riscos.map((r, i) => (
                            <div key={i} className="bg-[color:var(--color-background)] p-5">
                              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-700 mb-2">{r.ponto}</div>
                              <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">{r.descricao}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {cnpjData && !cnpjData.analise && (
                  <div className="mt-10 p-6 border border-amber-200 bg-amber-50 text-[13px] text-amber-900 leading-relaxed space-y-2">
                    <p>
                      <strong>Análise IA indisponível.</strong> Os dados públicos da empresa carregaram, mas a análise tributária automática não pôde ser gerada agora.
                    </p>
                    {(cnpjData as CnpjResponse & { analise_debug?: string }).analise_debug && (
                      <p className="font-mono text-[11px] text-amber-700 break-all border-t border-amber-200 pt-2 mt-2">
                        <strong>Debug:</strong> {(cnpjData as CnpjResponse & { analise_debug?: string }).analise_debug}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-12 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contato"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-5 bg-[color:var(--color-brand)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(30,58,138,0.5)]"
                  >
                    Agendar diagnóstico
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
        {step < 6 && (
          <div className="mt-16 flex items-center justify-between pt-8 border-t border-[color:var(--color-hairline)]">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5 | 6)}
              disabled={step === 1}
              className="group inline-flex items-center gap-2 px-5 py-3 text-[13px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Voltar
            </button>
            <button
              onClick={() => {
                if (step === 5) {
                  // Antes do resultado: abre lead gate
                  setGateOpen(true);
                } else {
                  setStep((s) => Math.min(6, s + 1) as 1 | 2 | 3 | 4 | 5 | 6);
                }
              }}
              disabled={!canNext}
              className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none"
            >
              {step === 5 ? "Ver estimativa" : step === 1 && !cnpjData ? "Pular CNPJ" : "Próxima"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </Container>

      {/* Lead Gate Modal */}
      <AnimatePresence>
        {gateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => {
              if (!leadLoading && !leadSent) {
                if (e.target === e.currentTarget) setGateOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[color:var(--color-background)] w-full max-w-md p-8 lg:p-10 relative grain"
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-6">
                <Lock className="w-3 h-3" />
                Quase lá
              </div>
              <h3 className="font-serif text-2xl lg:text-3xl leading-tight text-[color:var(--color-ink)] mb-3">
                Antes de mostrar o potencial,
                <br />
                <span className="italic text-[color:var(--color-brand)]">
                  precisamos te identificar.
                </span>
              </h3>
              <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)] mb-8">
                Email e telefone obrigatórios. A estimativa fica liberada
                imediatamente e nossa equipe entra em contato em até 1 dia útil.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enviarLead();
                }}
                className="space-y-5"
              >
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="voce@empresa.com.br"
                    disabled={leadLoading || leadSent}
                    className="w-full bg-transparent border-b border-[color:var(--color-ink)] pb-2 text-[16px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none focus:border-[color:var(--color-brand)]"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-2">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={leadFone}
                    onChange={(e) => setLeadFone(maskFone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    inputMode="numeric"
                    disabled={leadLoading || leadSent}
                    className="w-full bg-transparent border-b border-[color:var(--color-ink)] pb-2 text-[16px] font-mono text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none focus:border-[color:var(--color-brand)]"
                  />
                </div>

                {leadError && (
                  <p className="text-[12px] text-red-700">{leadError}</p>
                )}

                <button
                  type="submit"
                  disabled={leadLoading || leadSent}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {leadSent ? (
                    <>
                      <Check className="w-4 h-4" />
                      Liberando…
                    </>
                  ) : leadLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      Ver estimativa agora
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-[10px] text-[color:var(--color-ink-faint)] leading-relaxed">
                Seus dados ficam em sigilo. Não compartilhamos com terceiros.
                Consulta gratuita, sem compromisso.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
