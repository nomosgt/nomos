"use client";

import { motion } from "framer-motion";
import { formatBRL } from "@/lib/utils";
import type { CenarioResult } from "@/lib/simulador/types";

interface Props {
  cenario: CenarioResult; // usa o cenário BASE por padrão
}

export function FinancialDashboard({ cenario }: Props) {
  const rows = [
    {
      label: "Potencial bruto",
      value: cenario.total_bruto,
      variant: "neutral" as const,
      note: "Antes de qualquer redução",
    },
    {
      label: "Redutores aplicados",
      value: -(cenario.total_bruto - cenario.total_ajustado),
      variant: "negative" as const,
      note: cenario.redutores.map((r) => `${r.nome} (-${r.reducao_pct}%)`).join(" · "),
    },
    {
      label: "Potencial ajustado",
      value: cenario.total_ajustado,
      variant: "neutral" as const,
      note: "Após redutores de confiabilidade documental",
    },
    ...(cenario.cap_aplicado
      ? [
          {
            label: `Trava de cap (${cenario.cap_pct.toFixed(1)}%)`,
            value: -(cenario.total_ajustado - cenario.total_final),
            variant: "negative" as const,
            note: "Limite de segurança sobre o faturamento acumulado",
          },
        ]
      : []),
    {
      label: "Potencial final estimado",
      value: cenario.total_final,
      variant: "highlight" as const,
      note: "",
    },
    {
      label: `Honorários (${cenario.honorarios_pct}%)`,
      value: -Math.round(cenario.total_final * (cenario.honorarios_pct / 100)),
      variant: "negative" as const,
      note: "Padrão advocatício sobre valor recuperado",
    },
    {
      label: "Valor líquido ao cliente",
      value: cenario.valor_liquido_cliente,
      variant: "positive" as const,
      note: `Prazo estimado ~${cenario.prazo_estimado_meses} meses`,
    },
  ];

  return (
    <div className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] overflow-hidden">
      <div className="p-6 lg:p-8 border-b border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] mb-2">
          Dashboard financeiro · cenário base
        </div>
        <h4 className="font-serif text-xl lg:text-2xl text-[color:var(--color-ink)]">
          Do bruto ao líquido — passo a passo
        </h4>
        <p className="mt-1 text-[12px] text-[color:var(--color-ink-muted)]">
          Cada redutor e trava aplicada, com explicação
        </p>
      </div>

      <div className="divide-y divide-[color:var(--color-hairline)]">
        {rows.map((row, i) => (
          <motion.div
            key={row.label + i}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className={`p-5 lg:p-6 grid grid-cols-[1fr_auto] gap-4 items-center ${
              row.variant === "highlight"
                ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                : row.variant === "positive"
                ? "bg-[color:var(--color-brand)]/5"
                : ""
            }`}
          >
            <div>
              <div
                className={`text-[13px] ${
                  row.variant === "highlight"
                    ? "font-medium text-[color:var(--color-paper)]"
                    : row.variant === "positive"
                    ? "font-medium text-[color:var(--color-brand)]"
                    : row.variant === "negative"
                    ? "text-[color:var(--color-ink-muted)]"
                    : "text-[color:var(--color-ink)]"
                }`}
              >
                {row.label}
              </div>
              {row.note && (
                <div
                  className={`text-[11px] mt-0.5 leading-snug ${
                    row.variant === "highlight"
                      ? "text-[color:var(--color-paper)]/60"
                      : "text-[color:var(--color-ink-faint)]"
                  }`}
                >
                  {row.note}
                </div>
              )}
            </div>
            <div
              className={`font-mono text-[15px] lg:text-[17px] tabular-nums whitespace-nowrap ${
                row.variant === "highlight"
                  ? "text-[color:var(--color-paper)] font-medium"
                  : row.variant === "positive"
                  ? "text-[color:var(--color-brand)] font-medium"
                  : row.variant === "negative"
                  ? "text-[color:var(--color-ink-muted)]"
                  : "text-[color:var(--color-ink)]"
              }`}
            >
              {row.value < 0 ? "−" : ""}
              {formatBRL(Math.abs(row.value), { compact: false })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
