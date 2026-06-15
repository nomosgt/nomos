"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Filter, Sparkles, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/section";
import {
  TESES,
  TRIBUTOS,
  ESFERAS,
  VIAS,
  STATUS_LABEL,
  STATUS_TONE,
  RISCO_DOT,
  type Tese,
  type Status,
  type Esfera,
  type Via,
} from "./teses-data";

const STATUS_OPTIONS: Status[] = ["vigor", "discussao", "favoravel", "desfavoravel"];

export function TesesBrowser() {
  const [query, setQuery] = useState("");
  const [activeTributos, setActiveTributos] = useState<Set<string>>(new Set());
  const [activeStatus, setActiveStatus] = useState<Set<Status>>(new Set());
  const [activeEsfera, setActiveEsfera] = useState<Set<Esfera>>(new Set());
  const [activeVia, setActiveVia] = useState<Set<Via>>(new Set());
  const [openTese, setOpenTese] = useState<Tese | null>(null);

  const filtered = useMemo(() => {
    return TESES.filter((t) => {
      if (query) {
        const q = query.toLowerCase();
        const matches =
          t.title.toLowerCase().includes(q) ||
          t.resumo.toLowerCase().includes(q) ||
          t.base.toLowerCase().includes(q) ||
          t.tributos.some((tr) => tr.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (activeTributos.size > 0 && !t.tributos.some((tr) => activeTributos.has(tr))) {
        return false;
      }
      if (activeStatus.size > 0 && !activeStatus.has(t.status)) return false;
      if (activeEsfera.size > 0 && !activeEsfera.has(t.esfera)) return false;
      if (activeVia.size > 0 && !activeVia.has(t.via)) return false;
      return true;
    });
  }, [query, activeTributos, activeStatus, activeEsfera, activeVia]);

  const toggleSet = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const clearAll = () => {
    setQuery("");
    setActiveTributos(new Set());
    setActiveStatus(new Set());
    setActiveEsfera(new Set());
    setActiveVia(new Set());
  };

  const hasActive =
    !!query ||
    activeTributos.size + activeStatus.size + activeEsfera.size + activeVia.size > 0;

  return (
    <section className="border-t border-[color:var(--color-hairline)] pb-32">
      <Container>
        {/* Search bar */}
        <div className="pt-10 lg:pt-16">
          <div className="relative border border-[color:var(--color-ink)] flex items-center">
            <Search className="absolute left-5 w-4 h-4 text-[color:var(--color-ink-faint)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procure por tese, tributo, súmula ou palavra-chave…"
              className="w-full pl-14 pr-5 py-5 lg:py-6 bg-transparent text-[15px] lg:text-[17px] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="px-5 text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Layout: filters sidebar + results */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-16">
          {/* Filters */}
          <aside className="lg:sticky lg:top-32 lg:self-start space-y-10">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
                  <Filter className="w-3 h-3" />
                  Filtros
                </div>
                {hasActive && (
                  <button
                    onClick={clearAll}
                    className="text-[11px] font-mono uppercase tracking-[0.15em] text-[color:var(--color-brand)] hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <FilterGroup label="Tributo">
              {TRIBUTOS.map((t) => (
                <FilterChip
                  key={t}
                  active={activeTributos.has(t)}
                  onClick={() => toggleSet(activeTributos, t, setActiveTributos)}
                >
                  {t}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Status">
              {STATUS_OPTIONS.map((s) => (
                <FilterChip
                  key={s}
                  active={activeStatus.has(s)}
                  onClick={() => toggleSet(activeStatus, s, setActiveStatus)}
                >
                  {STATUS_LABEL[s]}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Esfera">
              {ESFERAS.map((e) => (
                <FilterChip
                  key={e.value}
                  active={activeEsfera.has(e.value)}
                  onClick={() => toggleSet(activeEsfera, e.value, setActiveEsfera)}
                >
                  {e.label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Via">
              {VIAS.map((v) => (
                <FilterChip
                  key={v.value}
                  active={activeVia.has(v.value)}
                  onClick={() => toggleSet(activeVia, v.value, setActiveVia)}
                >
                  {v.label}
                </FilterChip>
              ))}
            </FilterGroup>
          </aside>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[color:var(--color-hairline)]">
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
                {filtered.length} {filtered.length === 1 ? "tese" : "teses"}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                Ordenado por relevância
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
              {filtered.map((tese, i) => (
                <motion.button
                  key={tese.slug}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.5 }}
                  onClick={() => setOpenTese(tese)}
                  className="group relative bg-[color:var(--color-background)] p-6 lg:p-8 text-left hover:bg-[color:var(--color-surface)] transition-colors duration-300 flex flex-col overflow-hidden"
                >
                  {/* Número Tema gigante outline atrás (estilo Bloomberg) */}
                  {tese.base.match(/(?:Tema|RE|REsp|EREsp)\s*([\d.]+)/i) && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-4 -bottom-8 font-serif text-[clamp(7rem,18vw,12rem)] leading-none tracking-tighter text-transparent select-none transition-opacity duration-500 opacity-[0.07] group-hover:opacity-[0.13]"
                      style={{
                        WebkitTextStroke: "1.5px var(--color-ink)",
                      }}
                    >
                      {tese.base.match(/(?:Tema|RE|REsp|EREsp)\s*([\d.]+)/i)?.[1]}
                    </span>
                  )}
                  {/* Risco dot + Status badge + ano */}
                  <div className="relative flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: RISCO_DOT[tese.risco] }}
                        title={`Risco ${tese.risco}`}
                      />
                      <span
                        className={`inline-flex items-center px-2.5 py-1 border text-[10px] font-mono uppercase tracking-[0.2em] ${STATUS_TONE[tese.status]}`}
                      >
                        {STATUS_LABEL[tese.status]}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                      {tese.via === "judicial" ? "Judicial" : "Administrativa"} · {tese.ano}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl lg:text-2xl leading-[1.15] tracking-tight text-[color:var(--color-ink)] mb-4 transition-colors group-hover:text-[color:var(--color-brand-dim)]">
                    {tese.title}
                  </h3>

                  <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)] mb-6 flex-1">
                    {tese.resumo}
                  </p>

                  {/* Tributo chips */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {tese.tributos.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center px-2 py-0.5 border border-[color:var(--color-hairline)] font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-ink-muted)]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[color:var(--color-hairline)]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">
                      {tese.base}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink)] group-hover:text-[color:var(--color-brand)] transition-colors">
                      Ver análise
                      <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </motion.button>
              ))}

              {filtered.length === 0 && (
                <div className="bg-[color:var(--color-background)] p-16 col-span-2 text-center">
                  <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-3">
                    Nenhum resultado
                  </div>
                  <p className="font-serif text-2xl text-[color:var(--color-ink)] max-w-md mx-auto">
                    Não encontramos teses com esses filtros. Tente limpar e
                    refazer a busca.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      {/* Detail modal */}
      <AnimatePresence>
        {openTese && (
          <TeseModal tese={openTese} onClose={() => setOpenTese(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-3">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 border text-[12px] transition-all duration-200 ${
        active
          ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
          : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function TeseModal({ tese, onClose }: { tese: Tese; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[70] flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[color:var(--color-ink)]/70 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative bg-[color:var(--color-background)] w-full max-w-3xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[color:var(--color-background)] border-b border-[color:var(--color-hairline)] flex items-center justify-between px-6 lg:px-10 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: RISCO_DOT[tese.risco] }}
            />
            <span
              className={`inline-flex items-center px-2.5 py-1 border text-[10px] font-mono uppercase tracking-[0.2em] ${STATUS_TONE[tese.status]}`}
            >
              {STATUS_LABEL[tese.status]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
              {tese.via === "judicial" ? "Judicial" : "Administrativa"} · {tese.base}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 lg:px-10 py-10 lg:py-14">
          <h2 className="font-serif text-3xl lg:text-5xl leading-[0.95] tracking-tight text-[color:var(--color-ink)] mb-6">
            {tese.title}
          </h2>

          <div className="flex flex-wrap gap-1.5 mb-10">
            {tese.tributos.map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-2.5 py-1 border border-[color:var(--color-ink)] font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink)]"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="font-serif text-xl lg:text-2xl leading-[1.4] text-[color:var(--color-ink)] mb-8">
            {tese.resumo}
          </p>

          <div className="prose-like space-y-5 text-[15px] leading-[1.7] text-[color:var(--color-ink-muted)] border-t border-[color:var(--color-hairline)] pt-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
              Análise técnica
            </div>
            <p>{tese.analise}</p>
          </div>

          {/* AI badge */}
          <div className="mt-10 flex items-center gap-2 px-3 py-2 border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand)] w-fit">
            <Sparkles className="w-3 h-3" />
            Análise revisada e atualizada por IA
          </div>

          <div className="mt-10 pt-8 border-t border-[color:var(--color-hairline)] flex flex-col sm:flex-row gap-3">
            <a
              href="/contato"
              className="group inline-flex items-center justify-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5"
            >
              Falar sobre essa tese
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] text-[13px] font-medium hover:bg-[color:var(--color-surface)]"
            >
              Voltar ao banco
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
