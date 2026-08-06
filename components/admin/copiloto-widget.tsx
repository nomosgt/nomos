"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface Prioridade {
  titulo: string;
  motivo: string;
  urgencia: "alta" | "media" | "baixa";
}

interface Resumo {
  resumo: string;
  prioridades: Prioridade[];
  lead_destaque: string;
  stats: {
    leads_7d: number;
    leads_novos: number;
    simulacoes_7d: number;
    cnpj_7d: number;
  };
}

const URG_STYLE: Record<string, string> = {
  alta: "border-rose-300 bg-rose-50 text-rose-800",
  media: "border-amber-300 bg-amber-50 text-amber-800",
  baixa: "border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]",
};

export function CopilotoWidget() {
  const [data, setData] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gerar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/copiloto");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Copiloto indisponivel.");
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
    <div className="border-2 border-[color:var(--color-brand)]/30 bg-gradient-to-br from-blue-50/40 to-transparent p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[color:var(--color-brand)]" />
          <h2 className="font-serif text-lg lg:text-xl text-[color:var(--color-ink)]">
            Copiloto NGT
          </h2>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] border border-[color:var(--color-brand)]/30 px-2 py-0.5">
            IA
          </span>
        </div>
        <button
          onClick={gerar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analisando operação…
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              {data ? "Atualizar análise" : "Gerar resumo executivo"}
            </>
          )}
        </button>
      </div>

      {!data && !loading && !error && (
        <p className="text-[13px] text-[color:var(--color-ink-muted)]">
          Análise inteligente dos últimos 7 dias: leads que precisam de atenção,
          simulações de alto valor e prioridades do dia — gerada por IA.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 border border-amber-200 bg-amber-50 text-[13px] text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Leads (7d)" value={data.stats.leads_7d} />
            <Stat label="Sem atendimento" value={data.stats.leads_novos} accent={data.stats.leads_novos > 0} />
            <Stat label="Simulações (7d)" value={data.stats.simulacoes_7d} />
            <Stat label="Consultas CNPJ" value={data.stats.cnpj_7d} />
          </div>

          <p className="text-[14px] leading-relaxed text-[color:var(--color-ink)]">
            {data.resumo}
          </p>

          {data.lead_destaque && (
            <div className="p-4 border-l-2 border-[color:var(--color-brand)] bg-[color:var(--color-surface)] text-[13px] text-[color:var(--color-ink)]">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] block mb-1">
                Lead em destaque
              </span>
              {data.lead_destaque}
            </div>
          )}

          {data.prioridades.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)]">
                Prioridades de hoje
              </div>
              {data.prioridades.map((p, i) => (
                <div
                  key={i}
                  className={`px-4 py-3 border text-[13px] ${URG_STYLE[p.urgencia]}`}
                >
                  <span className="font-medium">{p.titulo}</span>
                  <span className="opacity-80"> — {p.motivo}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">
        {label}
      </div>
      <div className={`font-mono text-xl tabular-nums ${accent ? "text-rose-700" : "text-[color:var(--color-ink)]"}`}>
        {value}
      </div>
    </div>
  );
}
