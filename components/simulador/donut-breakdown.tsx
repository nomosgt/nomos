"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { formatBRL } from "@/lib/utils";

export interface Segment {
  label: string;
  value: number;
  color: string;
  description: string;
}

interface DonutBreakdownProps {
  segments: Segment[];
  total: number;
}

export function DonutBreakdown({ segments, total }: DonutBreakdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });

  // Donut SVG: circunferência total = 2πr. Cada segmento ocupa fração proporcional.
  const SIZE = 240;
  const STROKE = 36;
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  // Cálculo puro (sem mutação) compatível com React Compiler.
  // Para cada segmento, offset = soma negativa dos dashes anteriores.
  const drawn = segments.map((s, i) => {
    const fraction = total > 0 ? s.value / total : 0;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const offset = segments
      .slice(0, i)
      .reduce(
        (acc, prev) =>
          acc - (total > 0 ? prev.value / total : 0) * circumference,
        0,
      );
    return { ...s, fraction, dash, gap, offset };
  });

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-center">
      {/* Donut SVG */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
        >
          {/* Track de fundo */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="var(--color-paper)"
            strokeOpacity="0.1"
            strokeWidth={STROKE}
          />
          {/* Segmentos animados */}
          {drawn.map((s, i) => (
            <motion.circle
              key={s.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              initial={{ strokeDashoffset: 0, opacity: 0 }}
              animate={
                inView
                  ? {
                      strokeDashoffset: s.offset,
                      opacity: 1,
                    }
                  : {}
              }
              transition={{
                strokeDashoffset: {
                  duration: 1.2,
                  delay: 0.3 + i * 0.25,
                  ease: [0.22, 1, 0.36, 1],
                },
                opacity: {
                  duration: 0.4,
                  delay: 0.3 + i * 0.25,
                },
              }}
            />
          ))}
        </svg>
        {/* Centro do donut: valor total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/50 mb-1">
              Total
            </div>
            <div className="font-mono text-2xl lg:text-3xl tracking-tight text-[color:var(--color-paper)] leading-none">
              {formatBRL(total, { compact: true })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Legenda + valores por segmento */}
      <div className="space-y-5">
        {drawn.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: 12 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: 0.5 + i * 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="grid grid-cols-[auto_1fr_auto] gap-4 items-center pb-4 border-b border-[color:var(--color-paper)]/10 last:border-0"
          >
            <span
              className="w-2.5 h-2.5 rounded-full mt-1"
              style={{ backgroundColor: s.color }}
            />
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/85">
                {s.label}
              </div>
              {s.description && (
                <div className="text-[11px] text-[color:var(--color-paper)]/45 mt-1 leading-snug">
                  {s.description}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-mono text-base lg:text-lg text-[color:var(--color-paper)]">
                {formatBRL(s.value)}
              </div>
              <div className="font-mono text-[10px] text-[color:var(--color-paper)]/45 mt-0.5">
                {(s.fraction * 100).toFixed(0)}%
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
// end of DonutBreakdown
