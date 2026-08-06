"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, AlertTriangle } from "lucide-react";

interface Analise {
  score: number;
  temperatura: "quente" | "morno" | "frio";
  perfil: string;
  abordagem: string;
  primeiro_contato: string;
}

const TEMP_STYLE: Record<string, string> = {
  quente: "text-rose-700 bg-rose-50 border-rose-200",
  morno: "text-amber-700 bg-amber-50 border-amber-200",
  frio: "text-blue-700 bg-blue-50 border-blue-200",
};

export function AnalisarLeadWidget({ contatoId }: { contatoId: string }) {
  const [data, setData] = useState<Analise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function analisar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analisar-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contato_id: contatoId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Analise indisponivel.");
        return;
      }
      setData(json);
    } catch {
      setError("Erro de conexao.");
    } finally {
      setLoading(false);
    }
  }

  function copiar() {
    if (!data) return;
    navigator.clipboard.writeText(data.primeiro_contato).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border-2 border-[color:var(--color-brand)]/30 bg-gradient-to-br from-blue-50/40 to-transparent p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[color:var(--color-brand)]" />
          <h3 className="font-serif text-lg text-[color:var(--color-ink)]">
            Análise do lead
          </h3>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] border border-[color:var(--color-brand)]/30 px-2 py-0.5">
            IA
          </span>
        </div>
        <button
          onClick={analisar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando…
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> {data ? "Reanalisar" : "Analisar com IA"}
            </>
          )}
        </button>
      </div>

      {!data && !loading && !error && (
        <p className="text-[13px] text-[color:var(--color-ink-muted)]">
          Score de qualificação, temperatura, estratégia de abordagem e rascunho
          de primeiro contato — gerados pela IA.
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-4xl tabular-nums text-[color:var(--color-ink)]">
                {Math.round(data.score)}
              </span>
              <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">/100</span>
            </div>
            <span
              className={`inline-block px-3 py-1 text-[11px] font-mono uppercase tracking-wider border ${TEMP_STYLE[data.temperatura]}`}
            >
              Lead {data.temperatura}
            </span>
          </div>

          <div className="text-[13px] leading-relaxed text-[color:var(--color-ink)]">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1">
              Perfil
            </span>
            {data.perfil}
          </div>

          <div className="text-[13px] leading-relaxed text-[color:var(--color-ink)]">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1">
              Estratégia de abordagem
            </span>
            {data.abordagem}
          </div>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-2">
              Rascunho de primeiro contato (WhatsApp)
            </span>
            <div className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-4 text-[13px] leading-relaxed whitespace-pre-wrap mb-2">
              {data.primeiro_contato}
            </div>
            <button
              onClick={copiar}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[color:var(--color-hairline)] text-[12px] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar mensagem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
