"use client";

import { motion } from "framer-motion";
import { Database, Shield } from "lucide-react";

interface Props {
  setor: string;
}

/**
 * Disclaimer institucional explicando origem dos dados.
 */
export function DisclaimerCard({ setor }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] p-5 lg:p-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start"
    >
      <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-3 md:pr-6 md:border-r md:border-[color:var(--color-hairline)]">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[color:var(--color-brand)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
            NGT Insights
          </span>
        </div>
      </div>

      <div className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)] space-y-2">
        <p>
          <strong className="text-[color:var(--color-ink)]">Análise comparativa.</strong>{" "}
          Estimativa construída a partir dos dados públicos da Receita Federal
          e de comparativos com clientes do mesmo segmento ({setor}) atendidos
          pelo nosso banco de dados.
        </p>
        <p className="text-[11px] text-[color:var(--color-ink-faint)] flex items-start gap-1.5 leading-snug">
          <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
          Análise preliminar e não vinculante. Valores definitivos dependem de
          confirmação por análise documental técnica.
        </p>
      </div>
    </motion.div>
  );
}
