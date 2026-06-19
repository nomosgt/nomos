"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Filter, Sparkles, ArrowUpRight, LayoutGrid, List, TrendingUp, Star } from "lucide-react";
import { Container } from "@/components/ui/section";
import {
  TESES,
  TRIBUTOS,
  ESFERAS,
  VIAS,
  SETORES_LIST,
  STATUS_LABEL,
  STATUS_TONE,
  RISCO_DOT,
  SETOR_LABEL,
  type Tese,
  type Status,
  type Esfera,
  type Via,
  type Setor,
} from "./teses-data";

const STATUS_OPTIONS: Status[] = ["vigor", "discussao", "favoravel", "desfavoravel"];

type ViewMode = "grid" | "list";
type SortMode = "destaque" | "recente" | "antigo" | "az";

const SORT_LABEL: Record<SortMode, string> = {
  destaque: "Destaques primeiro",
  recente: "Mais recentes",
  antigo: "Mais antigas",
  az: "A → Z",
};

export function TesesBrowser() {
  const [query, setQuery] = useState("");
  const [activeTributos, setActiveTributos] = useState<Set<string>>(new Set());
  const [activeStatus, setActiveStatus] = useState<Set<Status>>(new Set());
  const [activeEsfera, setActiveEsfera] = useState<Set<Esfera>>(new Set());
  const [activeVia, setActiveVia] = useState<Set<Via>>(new Set());
  const [activeSetor, setActiveSetor] = useState<Set<Setor>>(new Set());
  const [openTese, setOpenTese] = useState<Tese | null>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("destaque");

  // KPIs (sempre sobre TODAS as teses, não filtradas)
  const kpis = useMemo(() => ({
    total: TESES.length,
    vigor: TESES.filter((t) => t.status === "vigor").length,
    favoraveis: TESES.filter((t) => t.status === "favoravel").length,
    discussao: TESES.filter((t) => t.status === "discussao").length,
  }), []);

  // Filtragem + ordenação
  const filtered = useMemo(() => {
    const list = TESES.filter((t) => {
      if (query) {
        const q = query.toLowerCase();
        const m =
          t.title.toLowerCase().includes(q) ||
          t.resumo.toLowerCase().includes(q) ||
          t.base.toLowerCase().includes(q) ||
          t.tributos.some((tr) => tr.toLowerCase().includes(q));
        if (!m) return false;
      }
      if (activeTributos.size > 0 && !t.tributos.some((tr) => activeTributos.has(tr))) return false;
      if (activeStatus.size > 0 && !activeStatus.has(t.status)) return false;
      if (activeEsfera.size > 0 && !activeEsfera.has(t.esfera)) return false;
      if (activeVia.size > 0 && !activeVia.has(t.via)) return false;
      if (activeSetor.size > 0) {
        const tSet = new Set<Setor>(t.setores || []);
        // Multi-setor sempre passa quando filtra por algum setor específico
        const hasMatch = tSet.has("todos") || [...activeSetor].some((s) => tSet.has(s));
        if (!hasMatch) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sort === "destaque") {
        if (a.destaque && !b.destaque) return -1;
        if (!a.destaque && b.destaque) return 1;
        return b.ano - a.ano;
      }
      if (sort === "recente") return b.ano - a.ano;
      if (sort === "antigo") return a.ano - b.ano;
      if (sort === "az") return a.title.localeCompare(b.title, "pt-BR");
      return 0;
    });
  }, [query, activeTributos, activeStatus, activeEsfera, activeVia, activeSetor, sort]);

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
    setActiveSetor(new Set());
  };

  const totalFilters =
    activeTributos.size + activeStatus.size + activeEsfera.size + activeVia.size + activeSetor.size;
  const hasActive = !!query || totalFilters > 0;

  // Contagem por chip (mostra quantas teses ficariam selecionadas)
  const countByTributo = (t: string) => TESES.filter((te) => te.tributos.includes(t)).length;
  const countByStatus = (s: Status) => TESES.filter((te) => te.status === s).length;

  return (
    <section className="border-t border-[color:var(--color-hairline)] pb-32">
      <Container>
        {/* KPI band */}
        <div className="pt-10 lg:pt-16 grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)] mb-10">
          <Kpi label="Total no banco" value={String(kpis.total)} />
          <Kpi label="Em vigor" value={String(kpis.vigor)} tone="brand" />
          <Kpi label="Decididas favoráveis" value={String(kpis.favoraveis)} tone="green" />
          <Kpi label="Em discussão" value={String(kpis.discussao)} tone="amber" />
        </div>

        {/* Search bar */}
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
            <button onClick={() => setQuery("")} className="px-5 text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Layout: filters sidebar + results */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-16">
          {/* Filters */}
          <aside className="lg:sticky lg:top-32 lg:self-start space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
                <Filter className="w-3 h-3" />
                Filtros
                {totalFilters > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-mono bg-[color:var(--color-brand)] text-[color:var(--color-paper)] rounded-full">
                    {totalFilters}
                  </span>
                )}
              </div>
              {hasActive && (
                <button onClick={clearAll} className="text-[11px] font-mono uppercase tracking-[0.15em] text-[color:var(--color-brand)] hover:underline">
                  Limpar
                </button>
              )}
            </div>

            <FilterGroup label="Tributo">
              {TRIBUTOS.map((t) => (
                <FilterChip
                  key={t}
                  active={activeTributos.has(t)}
                  count={countByTributo(t)}
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
                  count={countByStatus(s)}
                  onClick={() => toggleSet(activeStatus, s, setActiveStatus)}
                >
                  {STATUS_LABEL[s]}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Setor">
              {SETORES_LIST.map((s) => (
                <FilterChip
                  key={s.value}
                  active={activeSetor.has(s.value)}
                  onClick={() => toggleSet(activeSetor, s.value, setActiveSetor)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Esfera">
              {ESFERAS.map((e) => (
                <FilterChip key={e.value} active={activeEsfera.has(e.value)} onClick={() => toggleSet(activeEsfera, e.value, setActiveEsfera)}>
                  {e.label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Via">
              {VIAS.map((v) => (
                <FilterChip key={v.value} active={activeVia.has(v.value)} onClick={() => toggleSet(activeVia, v.value, setActiveVia)}>
                  {v.label}
                </FilterChip>
              ))}
            </FilterGroup>
          </aside>

          {/* Results */}
          <div>
            {/* Toolbar: count + sort + view toggle */}
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[color:var(--color-hairline)] flex-wrap">
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
                {filtered.length} {filtered.length === 1 ? "tese" : "teses"}{hasActive ? " · filtrado" : ""}
              </div>
              <div className="flex items-center gap-3">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">Ordenar</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="bg-transparent border border-[color:var(--color-hairline)] px-3 py-1.5 text-[12px] focus:outline-none focus:border-[color:var(--color-ink)]"
                >
                  {(Object.keys(SORT_LABEL) as SortMode[]).map((k) => (
                    <option key={k} value={k}>{SORT_LABEL[k]}</option>
                  ))}
                </select>
                <div className="flex items-center border border-[color:var(--color-hairline)]">
                  <button
                    onClick={() => setView("grid")}
                    aria-label="Visualização em grade"
                    className={`p-1.5 ${view === "grid" ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]" : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    aria-label="Visualização em lista"
                    className={`p-1.5 ${view === "list" ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]" : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid or List */}
            {filtered.length === 0 ? (
              <EmptyState onClear={clearAll} />
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
                {filtered.map((tese, i) => (
                  <TeseCard key={tese.slug} tese={tese} index={i} onClick={() => setOpenTese(tese)} />
                ))}
              </div>
            ) : (
              <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] bg-[color:var(--color-background)]">
                {filtered.map((tese, i) => (
                  <TeseListRow key={tese.slug} tese={tese} index={i} onClick={() => setOpenTese(tese)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* Detail modal */}
      <AnimatePresence>
        {openTese && <TeseModal tese={openTese} onClose={() => setOpenTese(null)} />}
      </AnimatePresence>
    </section>
  );
}

/* ----------- componentes auxiliares ----------- */

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "brand" | "green" | "amber" }) {
  const color =
    tone === "brand" ? "text-[color:var(--color-brand)]" :
    tone === "green" ? "text-[#3B9F4F]" :
    tone === "amber" ? "text-[#D4A024]" : "text-[color:var(--color-ink)]";
  return (
    <div className="bg-[color:var(--color-background)] p-5 lg:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-2">
        {label}
      </div>
      <div className={`font-mono text-3xl lg:text-4xl tracking-tight leading-none ${color}`}>
        {value}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-3">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-[12px] transition-all duration-200 ${
        active
          ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
          : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span className={`text-[10px] font-mono ${active ? "text-[color:var(--color-paper)]/60" : "text-[color:var(--color-ink-faint)]"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function TeseCard({ tese, index, onClick }: { tese: Tese; index: number; onClick: () => void }) {
  const temaMatch = tese.base.match(/(?:Tema|RE|REsp|EREsp)\s*([\d.]+)/i);
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5 }}
      onClick={onClick}
      className="group relative bg-[color:var(--color-background)] p-6 lg:p-8 text-left hover:bg-[color:var(--color-surface)] transition-colors duration-300 flex flex-col overflow-hidden"
    >
      {temaMatch && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -bottom-8 font-serif text-[clamp(7rem,18vw,12rem)] leading-none tracking-tighter text-transparent select-none transition-opacity duration-500 opacity-[0.07] group-hover:opacity-[0.13]"
          style={{ WebkitTextStroke: "1.5px var(--color-ink)" }}
        >
          {temaMatch[1]}
        </span>
      )}
      {tese.destaque && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 bg-[color:var(--color-brand)] text-[color:var(--color-paper)] text-[9px] font-mono uppercase tracking-[0.2em]">
          <Star className="w-2.5 h-2.5 fill-current" />
          Destaque
        </div>
      )}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISCO_DOT[tese.risco] }} title={`Risco ${tese.risco}`} />
          <span className={`inline-flex items-center px-2.5 py-1 border text-[10px] font-mono uppercase tracking-[0.2em] ${STATUS_TONE[tese.status]}`}>
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

      <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)] mb-5 flex-1">
        {tese.resumo}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {tese.tributos.map((t) => (
          <span key={t} className="inline-flex items-center px-2 py-0.5 border border-[color:var(--color-hairline)] font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-ink-muted)]">
            {t}
          </span>
        ))}
      </div>

      {tese.setores && tese.setores.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-5">
          {tese.setores.map((s) => (
            <span key={s} className="text-[10px] font-mono uppercase tracking-[0.15em] text-[color:var(--color-brand)]">
              ◇ {SETOR_LABEL[s]}
            </span>
          ))}
        </div>
      )}

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
  );
}

function TeseListRow({ tese, index, onClick }: { tese: Tese; index: number; onClick: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="group w-full px-5 py-4 text-left hover:bg-[color:var(--color-surface)] transition-colors grid grid-cols-[auto_1fr_auto] gap-4 items-center"
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISCO_DOT[tese.risco] }} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {tese.destaque && <Star className="w-3 h-3 fill-current text-[color:var(--color-brand)]" />}
          <span className="font-serif text-[15px] text-[color:var(--color-ink)] truncate">
            {tese.title}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 border text-[9px] font-mono uppercase tracking-wider ${STATUS_TONE[tese.status]}`}>
            {STATUS_LABEL[tese.status]}
          </span>
        </div>
        <div className="text-[11px] text-[color:var(--color-ink-faint)] font-mono">
          {tese.base} · {tese.via === "judicial" ? "Judicial" : "Admin"} · {tese.tributos.join(", ")}
        </div>
      </div>
      <ArrowUpRight className="w-4 h-4 text-[color:var(--color-ink-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </motion.button>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-12 lg:p-16 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-4">
        Nenhuma tese com esses filtros
      </div>
      <p className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)] max-w-md mx-auto mb-6 leading-tight">
        Tente afrouxar os filtros — ou procura por <em>tributo</em>, <em>tema</em> ou <em>setor</em>.
      </p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-5 py-3 text-[12px] font-mono uppercase tracking-[0.2em] bg-[color:var(--color-ink)] text-[color:var(--color-paper)] hover:-translate-y-0.5 transition-transform"
      >
        Limpar todos os filtros
      </button>
    </div>
  );
}

function TeseModal({ tese, onClose }: { tese: Tese; onClose: () => void }) {
  // Tese relacionada: mesma tese e categoria, diferente slug
  const related = TESES.filter(
    (t) => t.slug !== tese.slug && (t.tributos.some((x) => tese.tributos.includes(x)) || t.status === tese.status),
  ).slice(0, 3);

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
        <div className="sticky top-0 z-10 bg-[color:var(--color-background)] border-b border-[color:var(--color-hairline)] flex items-center justify-between px-6 lg:px-10 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISCO_DOT[tese.risco] }} />
            <span className={`inline-flex items-center px-2.5 py-1 border text-[10px] font-mono uppercase tracking-[0.2em] ${STATUS_TONE[tese.status]}`}>
              {STATUS_LABEL[tese.status]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
              {tese.via === "judicial" ? "Judicial" : "Administrativa"} · {tese.base}
            </span>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 lg:px-10 py-10 lg:py-14">
          {tese.destaque && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[color:var(--color-brand)] text-[color:var(--color-paper)] text-[10px] font-mono uppercase tracking-[0.2em] mb-5">
              <Star className="w-3 h-3 fill-current" />
              Tese em destaque
            </div>
          )}
          <h2 className="font-serif text-3xl lg:text-5xl leading-[0.95] tracking-tight text-[color:var(--color-ink)] mb-6">
            {tese.title}
          </h2>

          <div className="flex flex-wrap gap-1.5 mb-6">
            {tese.tributos.map((t) => (
              <span key={t} className="inline-flex items-center px-2.5 py-1 border border-[color:var(--color-ink)] font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink)]">
                {t}
              </span>
            ))}
          </div>

          {(tese.setores || tese.regimes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {tese.setores && tese.setores.length > 0 && (
                <Aplicabilidade label="Setores típicos">
                  {tese.setores.map((s) => SETOR_LABEL[s]).join(" · ")}
                </Aplicabilidade>
              )}
              {tese.regimes && tese.regimes.length > 0 && (
                <Aplicabilidade label="Regime tributário">
                  {tese.regimes.includes("ambos" as never)
                    ? "Lucro Real e Lucro Presumido"
                    : tese.regimes.map((r) => (r === "real" ? "Lucro Real" : "Lucro Presumido")).join(" · ")}
                </Aplicabilidade>
              )}
            </div>
          )}

          <p className="font-serif text-xl lg:text-2xl leading-[1.4] text-[color:var(--color-ink)] mb-8">
            {tese.resumo}
          </p>

          <div className="prose-like space-y-5 text-[15px] leading-[1.7] text-[color:var(--color-ink-muted)] border-t border-[color:var(--color-hairline)] pt-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
              Análise técnica
            </div>
            <p>{tese.analise}</p>
          </div>

          <div className="mt-10 flex items-center gap-2 px-3 py-2 border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand)] w-fit">
            <Sparkles className="w-3 h-3" />
            Análise revisada e atualizada por IA
          </div>

          {related.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[color:var(--color-hairline)]">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-5 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Teses relacionadas
              </div>
              <div className="space-y-2">
                {related.map((r) => (
                  <a
                    key={r.slug}
                    href={`#${r.slug}`}
                    className="block p-3 border border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink)] transition-colors"
                  >
                    <div className="font-serif text-[15px] text-[color:var(--color-ink)] mb-1">{r.title}</div>
                    <div className="text-[11px] font-mono text-[color:var(--color-ink-faint)]">
                      {r.base} · {r.tributos.join(", ")}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

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

function Aplicabilidade({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[color:var(--color-brand)] pl-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-1">
        {label}
      </div>
      <div className="text-[13px] text-[color:var(--color-ink)]">{children}</div>
    </div>
  );
}
// end of TesesBrowser
