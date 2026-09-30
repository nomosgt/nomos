"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ShieldQuestion } from "lucide-react";

interface Aprovacao {
  id: string;
  created_at: string;
  titulo: string;
  corpo: string;
  status: "pendente" | "aprovada" | "recusada";
  origem: "admin" | "parceiro";
  origem_nome: string | null;
  resposta: string | null;
  respondido_em: string | null;
}

export function AprovacaoCard({ aprovacao }: { aprovacao: Aprovacao }) {
  const router = useRouter();
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState<null | "aprovada" | "recusada">(null);
  const [erro, setErro] = useState<string | null>(null);

  async function decidir(decisao: "aprovada" | "recusada") {
    if (decisao === "recusada" && resposta.trim().length < 3) {
      setErro("Ao recusar, descreva o motivo em uma linha para orientar a equipe.");
      return;
    }
    setEnviando(decisao);
    setErro(null);
    try {
      const r = await fetch("/api/sala/aprovacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: aprovacao.id, decisao, resposta: resposta.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.error || "Falha ao registrar a decisão.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(null);
    }
  }

  const pendente = aprovacao.status === "pendente";

  return (
    <div
      className={`border bg-[color:var(--color-paper)] p-6 ${
        pendente
          ? "border-amber-300 border-l-4 border-l-amber-500"
          : "border-[color:var(--color-hairline)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <ShieldQuestion className="w-4 h-4 text-[color:var(--color-brand)]" />
          <h3 className="font-serif text-lg text-[color:var(--color-ink)]">{aprovacao.titulo}</h3>
        </div>
        {aprovacao.status === "aprovada" && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-emerald-700 bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Aprovada
          </span>
        )}
        {aprovacao.status === "recusada" && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 text-red-700 bg-red-50 border border-red-200">
            <XCircle className="w-3 h-3" /> Recusada
          </span>
        )}
      </div>

      <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)] mb-4">
        {aprovacao.origem === "parceiro"
          ? `Solicitado por ${aprovacao.origem_nome || "colaborador"} · `
          : "Solicitado pela equipe Arché · "}
        {new Date(aprovacao.created_at).toLocaleDateString("pt-BR")}
      </div>

      <p className="text-[14px] leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap mb-4">
        {aprovacao.corpo}
      </p>

      {pendente ? (
        <div className="space-y-3 border-t border-[color:var(--color-hairline)] pt-4">
          <textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            rows={2}
            placeholder="Comentário (opcional ao aprovar; obrigatório ao recusar)…"
            className="w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]"
          />
          {erro && <p className="text-[12px] text-red-700">{erro}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void decidir("aprovada")}
              disabled={enviando !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all hover:-translate-y-0.5"
            >
              {enviando === "aprovada" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Aprovar
            </button>
            <button
              onClick={() => void decidir("recusada")}
              disabled={enviando !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-700 text-[13px] font-medium hover:bg-red-50 disabled:opacity-50 transition-all"
            >
              {enviando === "recusada" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Recusar
            </button>
          </div>
        </div>
      ) : (
        (aprovacao.resposta || aprovacao.respondido_em) && (
          <div className="border-t border-[color:var(--color-hairline)] pt-3 text-[13px] text-[color:var(--color-ink-muted)]">
            {aprovacao.resposta && <p className="mb-1">&ldquo;{aprovacao.resposta}&rdquo;</p>}
            {aprovacao.respondido_em && (
              <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                respondido em {new Date(aprovacao.respondido_em).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        )
      )}
    </div>
  );
}
