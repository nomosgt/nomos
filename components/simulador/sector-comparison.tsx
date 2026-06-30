"use client";

import { motion } from "framer-motion";

interface Props {
  empresaPct: number;
  setorPct: number;
  setorLabel: string;
}

/**
 * Barras verticais comparando recuperacao da empresa vs media do setor.
 * Anima altura das barras.
 */
export function SectorComparison({ empresaPct, setorPct, setorLabel }: Props) {
  const max = Math.max(empresaPct, setorPct) * 1.15;
  const empresaH = (empresaPct / max) * 100;
  const setorH = (setorPct / max) * 100;
  const diff = empresaPct - setorPct;
  const acima = diff > 0;

  return (
    <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-6 lg:p-8">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
        Benchmark setorial
      </div>
      <h4 className="font-serif text-xl lg:text-2xl text-[color:var(--color-ink)] mb-1">
        Sua empresa vs. média {setorLabel}
      </h4>
      <p className="text-[12px] text-[color:var(--color-ink-muted)] mb-8">
        Percentual recuperado em relação ao faturamento (janela 5 anos)
      </p>

      <div className="grid grid-cols-2 gap-8 items-end h-[200px] mb-4">
        {/* Empresa */}
        <div className="flex flex-col items-center justify-end h-full">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2 }}
            className="font-mono text-[13px] tabular-nums text-[color:var(--color-brand)] mb-2"
          >
            {empresaPct.toFixed(1)}%
          </motion.div>
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: `${empresaH}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[80px] bg-[color:var(--color-brand)]"
            style={{ minHeight: 4 }}
          />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] mt-3">
            Sua empresa
          </div>
        </div>

        {/* Setor */}
        <div className="flex flex-col items-center justify-end h-full">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4 }}
            className="font-mono text-[13px] tabular-nums text-[color:var(--color-ink-muted)] mb-2"
          >
            {setorPct.toFixed(1)}%
          </motion.div>
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: `${setorH}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[80px] bg-[color:var(--color-ink-faint)]"
            style={{ minHeight: 4 }}
          />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] mt-3">
            Média {setorLabel}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.6 }}
        className="pt-4 border-t border-[color:var(--color-hairline)] text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]"
      >
        Seu perfil estimado está{" "}
        <span
          className={
            acima
              ? "font-medium text-[color:var(--color-brand)]"
              : "font-medium text-amber-700"
          }
        >
          {Math.abs(diff).toFixed(1)} pontos percentuais{" "}
          {acima ? "acima" : "abaixo"}
        </span>{" "}
        da média de empresas do mesmo segmento atendidas pela NGT.
      </motion.div>
    </div>
  );
}
