"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldQuestion, Send, Loader2, CheckCircle2, XCircle, Clock,
} from "lucide-react";

/**
 * Central do Parceiro · Aprovações do cliente — o colaborador envia uma
 * questão direta para o cliente aprovar ou recusar na Sala Arché e
 * acompanha a resposta aqui.
 */

interface ClienteSala { user_id: string; nome: string; empresa: string | null }
interface Minha {
  id: string; created_at: string; titulo: string; corpo: string;
  status: string; resposta: string | null; respondido_em: string | null;
}

const inputCls =
  "w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";

export function AprovacoesParceiro() {
  const [clientes, setClientes] = useState<ClienteSala[]>([]);
  const [minhas, setMinhas] = useState<Minha[]>([]);
  const [indisponivel, setIndisponivel] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/parceiros/aprovacoes", { cache: "no-store" });
      if (!r.ok) { setIndisponivel(true); return; }
      const j = await r.json();
      setClientes(j.clientes ?? []);
      setMinhas(j.minhas ?? []);
    } catch {
      setIndisponivel(true);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function enviar() {
    if (!clienteId || titulo.trim().length < 3 || corpo.trim().length < 3) return;
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/parceiros/aprovacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clienteId, titulo: titulo.trim(), corpo: corpo.trim() }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Falha ao enviar."); return; }
      setTitulo(""); setCorpo("");
      setMsg("✓ Enviada — o cliente decide na Sala Arché e a resposta aparece aqui.");
      void carregar();
    } catch {
      setMsg("Erro de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  if (indisponivel) return null;

  return (
    <div className="mt-10 border-2 border-[color:var(--color-brand)]/25 bg-blue-50/30 p-6 space-y-4">
      <h3 className="flex items-center gap-2 font-serif text-lg text-[color:var(--color-ink)]">
        <ShieldQuestion className="w-4 h-4 text-[color:var(--color-brand)]" />
        Aprovações do cliente
      </h3>
      <p className="text-[12px] text-[color:var(--color-ink-muted)]">
        Precisa do aval do cliente para avançar? Envie a questão — ele aprova ou
        recusa direto na Sala Arché e você recebe a resposta aqui.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className={inputCls} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">Selecione o cliente…</option>
          {clientes.map((c) => (
            <option key={c.user_id} value={c.user_id}>
              {c.nome}{c.empresa ? ` — ${c.empresa}` : ""}
            </option>
          ))}
        </select>
        <input className={inputCls} placeholder="Título da solicitação" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <textarea className={inputCls} rows={3} placeholder="Descreva com clareza o que o cliente precisa autorizar…" value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void enviar()}
          disabled={enviando || !clienteId || titulo.trim().length < 3 || corpo.trim().length < 3}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
        >
          {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Enviar ao cliente
        </button>
        {msg && <span className="text-[12px] text-[color:var(--color-ink-muted)]">{msg}</span>}
      </div>

      {minhas.length > 0 && (
        <div className="border-t border-[color:var(--color-hairline)] pt-3 space-y-2 max-h-64 overflow-y-auto">
          {minhas.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 text-[13px]">
              <div className="min-w-0">
                <div className="font-medium text-[color:var(--color-ink)] truncate">{a.titulo}</div>
                <div className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">
                  {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  {a.respondido_em && ` · respondida ${new Date(a.respondido_em).toLocaleDateString("pt-BR")}`}
                </div>
                {a.resposta && (
                  <div className="text-[12px] text-[color:var(--color-ink-muted)]">&ldquo;{a.resposta}&rdquo;</div>
                )}
              </div>
              {a.status === "pendente" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-amber-700 flex-shrink-0"><Clock className="w-3 h-3" />pendente</span>}
              {a.status === "aprovada" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-emerald-700 flex-shrink-0"><CheckCircle2 className="w-3 h-3" />aprovada</span>}
              {a.status === "recusada" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-red-700 flex-shrink-0"><XCircle className="w-3 h-3" />recusada</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
