"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, Clock, DollarSign, Lightbulb, ListTodo } from "lucide-react";
import type { DB } from "@/lib/parceiros/store";

interface Alerta {
  titulo: string;
  detalhe: string;
  tipo: "prazo" | "financeiro" | "oportunidade" | "pendencia";
}

interface Insights {
  resumo: string;
  alertas: Alerta[];
  proxima_acao: string;
}

const TIPO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  prazo: Clock,
  financeiro: DollarSign,
  oportunidade: Lightbulb,
  pendencia: ListTodo,
};

const TIPO_STYLE: Record<string, string> = {
  prazo: "border-rose-200 bg-rose-50 text-rose-800",
  financeiro: "border-emerald-200 bg-emerald-50 text-emerald-800",
  oportunidade: "border-blue-200 bg-blue-50 text-blue-800",
  pendencia: "border-amber-200 bg-amber-50 text-amber-800",
};

export function InsightsWidget({ db }: { db: DB }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gerar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parceiros/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot: {
            projetos: db.projetos,
            trabalhos: db.trabalhos,
            comissoes: db.comissoes,
            clientes_count: db.clientes.length,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Insights indisponiveis.");
        return;
      }
      setData(json);
    } catch {
      setError("Erro de conexao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-2 border-[color:var(--color-brand)]/30 bg-gradient-to-br from-blue-50/40 to-transparent p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[color:var(--color-brand)]" />
          <h3 className="font-serif text-lg text-[color:var(--color-ink)]">
            Insights da sua operação
          </h3>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] border border-[color:var(--color-brand)]/30 px-2 py-0.5">
            IA
          </span>
        </div>
        <button
          onClick={gerar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analisando…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {data ? "Atualizar" : "Analisar meus dados"}
            </>
          )}
        </button>
      </div>

      {!data && !loading && !error && (
        <p className="text-[13px] text-[color:var(--color-ink-muted)]">
          A IA analisa seus projetos, demandas e financeiro e aponta o que
          merece atenção agora.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 border border-amber-200 bg-amber-50 text-[13px] text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-[color:var(--color-ink)]">
            {data.resumo}
          </p>

          {data.alertas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.alertas.map((a, i) => {
                const Icon = TIPO_ICON[a.tipo] || Lightbulb;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 px-4 py-3 border text-[13px] ${TIPO_STYLE[a.tipo]}`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{a.titulo}</span>
                      <span className="opacity-80"> — {a.detalhe}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-4 border-l-2 border-[color:var(--color-brand)] bg-[color:var(--color-surface)] text-[13px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] block mb-1">
              Próxima ação recomendada
            </span>
            {data.proxima_acao}
          </div>
        </div>
      )}
    </section>
  );
}
