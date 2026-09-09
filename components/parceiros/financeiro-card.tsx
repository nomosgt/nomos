"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, CalendarClock, TrendingUp } from "lucide-react";

/**
 * Meu Financeiro — folha oficial definida pelo admin no Livro-Caixa.
 * O parceiro vê: % de comissão, total pendente e próximo pagamento.
 */

interface Fin {
  percentual: number;
  pendente: number;
  proximo_pagamento: string | null;
  proximo_valor: number | null;
  historico: { data: string; valor: number; descricao: string; status: "pago" | "pendente" }[];
  observacoes: string | null;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00");
  return Math.ceil((d.getTime() - Date.now()) / 864e5);
}

export function FinanceiroCard() {
  const [fin, setFin] = useState<Fin | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/parceiros/financeiro", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        if (alive) setFin(j);
      })
      .catch(() => {
        if (alive) setHidden(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (hidden || !fin) return null;
  const dias = diasAte(fin.proximo_pagamento);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] border border-[color:var(--color-ink)] overflow-hidden relative"
    >
      <div
        aria-hidden
        className="absolute -right-8 top-0 h-full opacity-[0.06] pointer-events-none select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/arche-symbol-white.png" alt="" className="h-full w-auto" />
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--color-paper)]/10">
        <div className="bg-[color:var(--color-ink)] p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50 mb-4">
            <TrendingUp className="w-3.5 h-3.5" /> Minha comissão
          </div>
          <div className="font-serif text-4xl tabular-nums">
            {Number(fin.percentual).toLocaleString("pt-BR")}
            <span className="text-[color:var(--color-brand-soft)]">%</span>
          </div>
          <div className="mt-2 text-[11px] text-[color:var(--color-paper)]/45">
            definida pela Arché sobre o êxito dos seus projetos
          </div>
        </div>

        <div className="bg-[color:var(--color-ink)] p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50 mb-4">
            <Wallet className="w-3.5 h-3.5" /> Pendente de repasse
          </div>
          <div className="font-serif text-4xl tabular-nums">{fmtBRL(Number(fin.pendente) || 0)}</div>
          <div className="mt-2 text-[11px] text-[color:var(--color-paper)]/45">
            valores confirmados aguardando pagamento
          </div>
        </div>

        <div className="bg-[color:var(--color-ink)] p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50 mb-4">
            <CalendarClock className="w-3.5 h-3.5" /> Próximo pagamento
          </div>
          {fin.proximo_pagamento ? (
            <>
              <div className="font-serif text-4xl tabular-nums">
                {fin.proximo_valor != null ? fmtBRL(Number(fin.proximo_valor)) : "—"}
              </div>
              <div className="mt-2 text-[11px] text-[color:var(--color-paper)]/60">
                {new Date(fin.proximo_pagamento + "T12:00:00").toLocaleDateString("pt-BR")}
                {dias != null && (
                  <span className={dias <= 5 ? "text-[color:var(--color-accent-soft)]" : ""}>
                    {" "}· {dias <= 0 ? "hoje" : `em ${dias} dia${dias === 1 ? "" : "s"}`}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-[13px] text-[color:var(--color-paper)]/45 pt-2">
              A definir pela equipe Arché.
            </div>
          )}
        </div>
      </div>

      {fin.historico?.length > 0 && (
        <div className="relative border-t border-[color:var(--color-paper)]/10 px-6 py-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/40 mb-2">
            Últimos repasses
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            {fin.historico.slice(-4).reverse().map((h, i) => (
              <div key={i} className="text-[12px] text-[color:var(--color-paper)]/70 tabular-nums">
                {new Date(h.data + "T12:00:00").toLocaleDateString("pt-BR")} — {fmtBRL(h.valor)}{" "}
                <span className={h.status === "pago" ? "text-emerald-400" : "text-[color:var(--color-accent-soft)]"}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fin.observacoes && (
        <div className="relative border-t border-[color:var(--color-paper)]/10 px-6 py-3 text-[12px] text-[color:var(--color-paper)]/60">
          {fin.observacoes}
        </div>
      )}
    </motion.section>
  );
}
