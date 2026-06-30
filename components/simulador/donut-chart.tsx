"use client";

import { motion } from "framer-motion";
import { formatBRL } from "@/lib/utils";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  total: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Donut chart SVG com motion stagger por segmento.
 */
export function DonutChart({ segments, total, size = 280, strokeWidth = 36 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulative = 0;
  const arcs = segments.map((seg, i) => {
    const pct = seg.value / total;
    const length = circumference * pct;
    const offset = circumference * (1 - cumulative);
    cumulative += pct;
    return {
      ...seg,
      pct,
      length,
      offset,
      index: i,
    };
  });

  return (
    <div className="flex flex-col lg:flex-row items-center gap-10">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
          aria-label="Distribuição dos créditos por tese"
        >
          {/* Fundo */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--color-hairline)"
            strokeWidth={strokeWidth}
            opacity="0.4"
          />
          {/* Segmentos animados */}
          {arcs.map((arc) => (
            <motion.circle
              key={arc.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.length} ${circumference}`}
              strokeDashoffset={-circumference + arc.offset}
              strokeLinecap="butt"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 1.4,
                delay: 0.2 + arc.index * 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </svg>

        {/* Centro do donut — total */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-1">
            Total estimado
          </div>
          <div className="font-mono text-2xl lg:text-3xl tracking-tight text-[color:var(--color-ink)]">
            {formatBRL(total, { compact: true })}
          </div>
        </motion.div>
      </div>

      {/* Legenda */}
      <div className="flex-1 space-y-4 min-w-[260px] w-full">
        {arcs.map((arc) => (
          <motion.div
            key={arc.label}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + arc.index * 0.15 }}
            className="flex items-center gap-4"
          >
            <div
              className="w-3 h-12 flex-shrink-0"
              style={{ backgroundColor: arc.color }}
            />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-serif text-[15px] text-[color:var(--color-ink)]">
                  {arc.label}
                </div>
                <div className="font-mono text-[12px] text-[color:var(--color-ink-muted)] tabular-nums">
                  {(arc.pct * 100).toFixed(1)}%
                </div>
              </div>
              <div className="font-mono text-[13px] text-[color:var(--color-brand)] tabular-nums mt-0.5">
                {formatBRL(arc.value, { compact: true })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
