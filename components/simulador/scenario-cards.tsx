"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/motion/count-up";
import { formatBRL } from "@/lib/utils";
import type { SimulacaoV2 } from "@/lib/simulador/types";

interface Props {
  simulacao: SimulacaoV2;
}

const NOMES: Record<string, string> = {
  pessimista: "Pessimista",
  base: "Base",
  otimista: "Otimista",
};

const DESCRICOES: Record<string, string> = {
  pessimista: "Cenário conservador, mínimo verificável.",
  base: "Cenário médio esperado com validação técnica.",
  otimista: "Cenário maximizado com todas as teses aderentes.",
};

const CORES: Record<string, { bg: string; text: string; accent: string }> = {
  pessimista: {
    bg: "bg-[color:var(--color-surface)]",
    text: "text-[color:var(--color-ink)]",
    accent: "#6B6B6B",
  },
  base: {
    bg: "bg-[color:var(--color-ink)]",
    text: "text-[color:var(--color-paper)]",
    accent: "#163A8A",
  },
  otimista: {
    bg: "bg-[color:var(--color-surface)]",
    text: "text-[color:var(--color-ink)]",
    accent: "#8C6F3F",
  },
};

export function ScenarioCards({ simulacao }: Props) {
  const cenarios = [
    simulacao.cenarios.pessimista,
    simulacao.cenarios.base,
    simulacao.cenarios.otimista,
  ];

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-6">
        Potencial teórico preliminar · sujeito à validação documental
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cenarios.map((c, i) => {
          const cor = CORES[c.nome];
          const highlight = c.nome === "base";
          return (
            <motion.div
              key={c.nome}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className={`${cor.bg} ${cor.text} p-6 lg:p-8 border ${
                highlight
                  ? "border-[color:var(--color-brand)] lg:scale-105 shadow-[0_20px_50px_-20px_rgba(22,58,138,0.35)]"
                  : "border-[color:var(--color-hairline)]"
              } transition-all`}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3"
                style={{ color: cor.accent }}
              >
                Cenário {NOMES[c.nome]}
              </div>
              <div
                className={`font-serif text-[clamp(1.75rem,4vw,3rem)] tracking-tight leading-none mb-1`}
              >
                <span className="text-[0.55em] mr-1 opacity-60">R$</span>
                <CountUp to={c.total_final} duration={2.2} />
              </div>
              <div
                className={`text-[11px] font-mono mb-5 ${
                  highlight ? "text-[color:var(--color-paper)]/60" : "text-[color:var(--color-ink-muted)]"
                }`}
              >
                até {c.cap_pct.toFixed(1)}% do faturamento acumulado
              </div>

              <div
                className={`text-[12px] leading-relaxed mb-6 ${
                  highlight ? "text-[color:var(--color-paper)]/70" : "text-[color:var(--color-ink-muted)]"
                }`}
              >
                {DESCRICOES[c.nome]}
              </div>

              <div
                className={`grid grid-cols-2 gap-3 pt-4 border-t ${
                  highlight ? "border-[color:var(--color-paper)]/15" : "border-[color:var(--color-hairline)]"
                }`}
              >
                <div>
                  <div
                    className={`font-mono text-[9px] uppercase tracking-[0.2em] mb-1 ${
                      highlight ? "text-[color:var(--color-paper)]/50" : "text-[color:var(--color-ink-faint)]"
                    }`}
                  >
                    Líquido ao cliente
                  </div>
                  <div className="font-mono text-[13px] tabular-nums">
                    {formatBRL(c.valor_liquido_cliente, { compact: true })}
                  </div>
                </div>
                <div>
                  <div
                    className={`font-mono text-[9px] uppercase tracking-[0.2em] mb-1 ${
                      highlight ? "text-[color:var(--color-paper)]/50" : "text-[color:var(--color-ink-faint)]"
                    }`}
                  >
                    Prazo estimado
                  </div>
                  <div className="font-mono text-[13px] tabular-nums">
                    ~{c.prazo_estimado_meses} meses
                  </div>
                </div>
              </div>

              {c.cap_aplicado && (
                <div
                  className={`mt-4 text-[10px] font-mono uppercase tracking-[0.2em] ${
                    highlight ? "text-amber-300" : "text-amber-700"
                  }`}
                >
                  ⚠ Trava de cap aplicada
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
