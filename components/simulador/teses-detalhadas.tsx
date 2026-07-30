"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, FileText, Clock, AlertOctagon } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { TeseDetalhada } from "@/lib/simulador/types";
import { CATEGORIA_LABEL } from "@/lib/simulador/scenarios";

interface Props {
  teses: TeseDetalhada[];
}

const RISCO_COLOR: Record<string, string> = {
  baixo: "text-emerald-700 bg-emerald-50 border-emerald-200",
  medio: "text-amber-700 bg-amber-50 border-amber-200",
  alto: "text-rose-700 bg-rose-50 border-rose-200",
};

const RISCO_LABEL: Record<string, string> = {
  baixo: "Risco baixo",
  medio: "Risco médio",
  alto: "Risco alto",
};

const ADER_COLOR: Record<string, string> = {
  alta: "text-emerald-700 bg-emerald-50 border-emerald-200",
  media: "text-amber-700 bg-amber-50 border-amber-200",
  baixa: "text-gray-600 bg-gray-50 border-gray-200",
};

const ADER_LABEL: Record<string, string> = {
  alta: "Alta aderência",
  media: "Aderência moderada",
  baixa: "Baixa aderência",
};

export function TesesDetalhadas({ teses }: Props) {
  // Agrupa por categoria
  const grupos = teses.reduce<Record<string, TeseDetalhada[]>>((acc, t) => {
    (acc[t.categoria] = acc[t.categoria] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
          Detalhamento por tese
        </div>
        <h3 className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)]">
          Teses aplicáveis · aderência, risco e documentação
        </h3>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-muted)] max-w-2xl">
          Cada tese com base de cálculo, aderência ao setor, risco jurídico, prazo
          esperado e documentação necessária para viabilizar.
        </p>
      </div>

      {Object.entries(grupos).map(([categoria, ts]) => (
        <div key={categoria}>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-4">
            {CATEGORIA_LABEL[categoria] || categoria}
          </div>
          <div className="space-y-3">
            {ts.map((t, i) => (
              <TeseCard key={t.nome} tese={t} delay={i * 0.06} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeseCard({ tese, delay }: { tese: TeseDetalhada; delay: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-5 lg:p-6 grid grid-cols-[1fr_auto] gap-4 items-center hover:bg-[color:var(--color-surface)] transition-colors"
      >
        <div>
          <div className="font-serif text-lg lg:text-xl text-[color:var(--color-ink)] mb-2">
            {tese.nome}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${
                ADER_COLOR[tese.aderencia]
              }`}
            >
              {ADER_LABEL[tese.aderencia]}
            </span>
            <span
              className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${
                RISCO_COLOR[tese.risco_juridico]
              }`}
            >
              {RISCO_LABEL[tese.risco_juridico]}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)]">
              <Clock className="w-2.5 h-2.5" />~{tese.prazo_meses}m
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">
            Cenário base
          </div>
          <div className="font-mono text-[15px] tabular-nums text-[color:var(--color-brand)]">
            {formatBRL(tese.valor_base, { compact: true })}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[color:var(--color-ink-faint)] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] p-5 lg:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px]"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
              Base de cálculo
            </div>
            <p className="text-[color:var(--color-ink-muted)] leading-relaxed">
              {tese.base_calculo_descricao}
            </p>
            <div className="mt-3 font-mono text-[11px] text-[color:var(--color-ink-faint)]">
              Percentual médio aplicado: {tese.percentual_pct.toFixed(2)}%
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
              Faixa por cenário
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[12px]">
                <span className="text-[color:var(--color-ink-muted)]">Pessimista</span>
                <span className="tabular-nums">
                  {formatBRL(tese.valor_pessimista, { compact: true })}
                </span>
              </div>
              <div className="flex justify-between font-mono text-[12px] text-[color:var(--color-brand)]">
                <span>Base</span>
                <span className="tabular-nums">
                  {formatBRL(tese.valor_base, { compact: true })}
                </span>
              </div>
              <div className="flex justify-between font-mono text-[12px]">
                <span className="text-[color:var(--color-ink-muted)]">Otimista</span>
                <span className="tabular-nums">
                  {formatBRL(tese.valor_otimista, { compact: true })}
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Documentação necessária para viabilizar
            </div>
            <div className="flex flex-wrap gap-2">
              {tese.docs_necessarios.map((d) => (
                <span
                  key={d}
                  className="inline-block px-3 py-1 text-[11px] font-mono border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] text-[color:var(--color-ink-muted)]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {tese.risco_juridico === "alto" && (
            <div className="md:col-span-2 flex items-start gap-2 p-3 border border-rose-200 bg-rose-50 text-[12px] text-rose-800">
              <AlertOctagon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Esta tese envolve controvérsia jurisprudencial ou tramitação longa. A
              recomendação exige análise prévia da situação processual da empresa.
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
