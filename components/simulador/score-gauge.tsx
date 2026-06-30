"use client";

import { motion } from "framer-motion";

interface Props {
  score: number; // 0-100
  label?: string;
}

/**
 * Gauge semicircular animado.
 */
export function ScoreGauge({ score, label = "Score de aderência" }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 80;
  const circumference = Math.PI * radius;
  const arc = (clamped / 100) * circumference;

  const cor =
    clamped >= 75
      ? "var(--color-brand)"
      : clamped >= 50
      ? "var(--color-brand-soft)"
      : "var(--color-ink-faint)";

  const nivel = clamped >= 75 ? "Alto" : clamped >= 50 ? "Moderado" : "Baixo";

  return (
    <div className="bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-6 lg:p-8 flex flex-col items-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-6">
        {label}
      </div>

      <div className="relative" style={{ width: 200, height: 120 }}>
        <svg viewBox="0 0 200 120" width="200" height="120">
          {/* Fundo */}
          <path
            d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
            fill="none"
            stroke="var(--color-hairline)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Progresso */}
          <motion.path
            d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
            fill="none"
            stroke={cor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: circumference - arc }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.0 }}
            className="font-mono text-4xl tracking-tight text-[color:var(--color-ink)] leading-none"
          >
            {Math.round(clamped)}
          </motion.div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mt-1">
            / 100
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.3 }}
        className="mt-4 text-center"
      >
        <div
          className="font-serif text-lg"
          style={{ color: cor }}
        >
          {nivel}
        </div>
        <div className="text-[11px] text-[color:var(--color-ink-muted)] max-w-[180px] mt-1 leading-snug">
          {clamped >= 75
            ? "Alta probabilidade de recuperação relevante."
            : clamped >= 50
            ? "Há oportunidades concretas a explorar."
            : "Análise documental requerida para confirmar."}
        </div>
      </motion.div>
    </div>
  );
}
