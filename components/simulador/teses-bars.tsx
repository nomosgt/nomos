"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { Tese } from "@/lib/validation/cnpj";

interface Props {
  teses: Tese[];
}

const APLICAB_PCT: Record<string, number> = {
  alta: 90,
  media: 60,
  baixa: 30,
};

const APLICAB_COLOR_BAR: Record<string, string> = {
  alta: "var(--color-brand)",
  media: "var(--color-brand-soft)",
  baixa: "var(--color-ink-faint)",
};

const APLICAB_LABEL: Record<string, string> = {
  alta: "Alta aderência",
  media: "Aderência moderada",
  baixa: "Baixa aderência",
};

/**
 * Teses como barras horizontais com aderência visual.
 */
export function TesesBars({ teses }: Props) {
  if (!teses.length) return null;

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-6 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" />
        Teses aplicáveis — aderência ao perfil
      </div>

      <div className="space-y-5">
        {teses.map((t, i) => {
          const pct = APLICAB_PCT[t.aplicabilidade] ?? 50;
          const cor = APLICAB_COLOR_BAR[t.aplicabilidade] ?? "var(--color-ink-faint)";
          return (
            <motion.div
              key={`${t.nome}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-[color:var(--color-hairline)] p-5"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="font-serif text-lg lg:text-xl text-[color:var(--color-ink)] flex-1">
                  {t.nome}
                </div>
                <div
                  className="font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: cor }}
                >
                  {APLICAB_LABEL[t.aplicabilidade]}
                </div>
              </div>

              {/* Barra animada */}
              <div className="relative h-1 bg-[color:var(--color-hairline)] mt-3 mb-4 overflow-hidden">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: pct / 100 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 1.2,
                    delay: 0.2 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformOrigin: "left", backgroundColor: cor }}
                  className="absolute inset-0 h-full"
                />
              </div>

              <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                {t.justificativa}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
