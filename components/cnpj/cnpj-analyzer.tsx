"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search,
  AlertCircle,
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Container } from "@/components/ui/section";
import { formatCnpj } from "@/lib/validation/cnpj";
import type { CnpjResponse } from "@/lib/validation/cnpj";
import { formatBRL } from "@/lib/utils";

function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

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

export function CnpjAnalyzer() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CnpjResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cnpj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não foi possível consultar esse CNPJ.");
        return;
      }
      setResult(json as CnpjResponse);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pb-32 border-t border-[color:var(--color-hairline)]">
      <Container>
        <div className="pt-12 lg:pt-16">
          {/* Form */}
          <form onSubmit={handleSubmit} className="max-w-3xl">
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-4 block">
              CNPJ da empresa
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="flex-1 bg-transparent border-b-2 border-[color:var(--color-ink)] pb-3 text-2xl lg:text-3xl font-mono tracking-tight text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || cnpj.replace(/\D/g, "").length !== 14}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(14,21,37,0.4)] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando…
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analisar
                  </>
                )}
              </button>
            </div>
            <p className="mt-3 text-[12px] text-[color:var(--color-ink-faint)]">
              Usamos só dados públicos (Receita Federal + BrasilAPI). Sem login,
              sem rastrear.
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-3 p-4 border border-red-300 bg-red-50 text-[13px] text-red-800"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </form>

          {/* Loading state — esqueleto */}
          {loading && !result && (
            <div className="mt-16 space-y-6">
              <div className="h-32 bg-[color:var(--color-surface)] animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-[color:var(--color-background)] animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mt-16 space-y-12"
              >
                {/* Card empresa */}
                <div className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-12 grain relative overflow-hidden">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand-soft)] mb-4 flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Empresa
                  </div>
                  <h2 className="font-serif text-3xl lg:text-5xl tracking-tight leading-[1.05] mb-3">
                    {result.empresa.razao_social || "Razão social não disponível"}
                  </h2>
                  {result.empresa.nome_fantasia && (
                    <div className="font-mono text-[13px] text-[color:var(--color-paper)]/60 mb-6">
                      {result.empresa.nome_fantasia}
                    </div>
                  )}
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-[13px]">
                    <Field
                      label="CNPJ"
                      value={formatCnpj(result.cnpj)}
                      mono
                    />
                    <Field
                      label="CNAE"
                      value={
                        result.empresa.cnae_principal
                          ? `${result.empresa.cnae_principal} · ${result.empresa.cnae_descricao || ""}`.trim()
                          : "—"
                      }
                    />
                    <Field label="Porte" value={result.empresa.porte || "—"} />
                    <Field
                      label="Situação"
                      value={result.empresa.situacao_cadastral || "—"}
                    />
                    <Field
                      label="Capital social"
                      value={
                        result.empresa.capital_social
                          ? formatBRL(result.empresa.capital_social, { compact: true })
                          : "—"
                      }
                      mono
                    />
                    <Field
                      label="Município/UF"
                      value={
                        [
                          result.empresa.municipio,
                          result.empresa.uf,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"
                      }
                    />
                    <Field
                      label="Abertura"
                      value={result.empresa.data_abertura || "—"}
                      mono
                    />
                    <Field
                      label="Sócios"
                      value={`${result.empresa.socios.length}`}
                      mono
                    />
                  </div>
                </div>

                {/* Análise IA */}
                {result.analise ? (
                  <>
                    {/* Perfil tributário */}
                    <Card title="Perfil tributário provável" icon={Building2}>
                      <div className="flex flex-wrap items-baseline gap-4 mb-4">
                        <div className="font-serif text-3xl lg:text-4xl tracking-tight text-[color:var(--color-brand)]">
                          {PERFIL_LABEL[result.analise.perfil_tributario] ||
                            result.analise.perfil_tributario}
                        </div>
                      </div>
                      <p className="text-[15px] leading-relaxed text-[color:var(--color-ink-muted)] max-w-2xl">
                        {result.analise.justificativa_perfil}
                      </p>
                    </Card>

                    {/* Oportunidades */}
                    {result.analise.oportunidades.length > 0 && (
                      <Card title="Teses aplicáveis" icon={TrendingUp}>
                        <div className="space-y-3">
                          {result.analise.oportunidades.map((o, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-start p-5 border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)]"
                            >
                              <div className="md:w-32">
                                <div className="font-serif text-lg text-[color:var(--color-ink)] mb-1">
                                  {o.nome}
                                </div>
                                <span
                                  className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${APLICAB_COLOR[o.aplicabilidade] || ""}`}
                                >
                                  {o.aplicabilidade}
                                </span>
                              </div>
                              <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)]">
                                {o.justificativa}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Riscos */}
                    {result.analise.riscos.length > 0 && (
                      <Card title="Pontos de atenção" icon={AlertTriangle}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                          {result.analise.riscos.map((r, i) => (
                            <div
                              key={i}
                              className="bg-[color:var(--color-background)] p-5"
                            >
                              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-700 mb-2">
                                {r.ponto}
                              </div>
                              <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                                {r.descricao}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Próxima ação */}
                    <Card title="Próxima ação sugerida" icon={ArrowRight}>
                      <p className="font-serif text-2xl lg:text-3xl leading-[1.3] text-[color:var(--color-ink)] mb-8 max-w-3xl">
                        {result.analise.proxima_acao}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                          href="/contato"
                          className="group inline-flex items-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5"
                        >
                          Falar com especialista
                          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                        <Link
                          href="/simulador"
                          className="group inline-flex items-center gap-2 px-6 py-4 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium transition-all duration-300 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-paper)]"
                        >
                          Calcular potencial
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </Card>
                  </>
                ) : (
                  <div className="p-6 border border-amber-200 bg-amber-50 text-[13px] text-amber-900 leading-relaxed">
                    <strong>Análise IA indisponível.</strong> Dados da empresa
                    carregaram, mas a análise tributária automática não pôde ser
                    gerada agora. Entre em contato para uma análise manual.
                  </div>
                )}

                {/* Fonte */}
                <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] pt-6 border-t border-[color:var(--color-hairline)]">
                  Fontes: {result.fonte.join(" + ")} · Análise: NOMOS GT (IA
                  assistida)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/45 mb-1">
        {label}
      </div>
      <div className={`${mono ? "font-mono" : ""} text-[13px] lg:text-[14px] text-[color:var(--color-paper)]`}>
        {value}
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-6 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}
// end of CnpjAnalyzer
