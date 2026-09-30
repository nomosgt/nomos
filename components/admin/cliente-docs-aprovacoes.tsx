"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Upload, Loader2, ShieldQuestion, CheckCircle2, XCircle, Clock, Send, Eye,
} from "lucide-react";

/**
 * Admin · página do cliente — enviar documentos (Storage) e
 * solicitar aprovações (o cliente decide na Sala).
 */

interface Caso { id: string; titulo: string }
interface Aprovacao {
  id: string; created_at: string; titulo: string; corpo: string;
  status: string; origem: string; origem_nome: string | null;
  resposta: string | null; respondido_em: string | null;
}

const inputCls =
  "w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";

export function ClienteDocsAprovacoes({ clienteId, casos }: { clienteId: string; casos: Caso[] }) {
  /* ---------- upload de documento ---------- */
  const [caseId, setCaseId] = useState(casos[0]?.id ?? "");
  const [categoria, setCategoria] = useState("geral");
  const [visibilidade, setVisibilidade] = useState<"cliente" | "interno">("cliente");
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const [msgDoc, setMsgDoc] = useState<string | null>(null);

  async function uploadDoc(file: File) {
    if (!caseId) { setMsgDoc("Crie um caso para o cliente antes de enviar documentos."); return; }
    setEnviandoDoc(true);
    setMsgDoc(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("case_id", caseId);
      fd.append("categoria", categoria);
      fd.append("visibilidade", visibilidade);
      const r = await fetch("/api/admin/clientes/documentos", { method: "POST", body: fd });
      const j = await r.json();
      setMsgDoc(r.ok ? `✓ ${file.name} publicado ${visibilidade === "cliente" ? "— o cliente já vê na Sala" : "(interno)"}` : j.error || "Falha no upload.");
    } catch {
      setMsgDoc("Erro de conexão.");
    } finally {
      setEnviandoDoc(false);
    }
  }

  /* ---------- aprovações ---------- */
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [enviandoApr, setEnviandoApr] = useState(false);
  const [msgApr, setMsgApr] = useState<string | null>(null);

  const carregarAprovacoes = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/aprovacoes?client_id=${clienteId}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok) setAprovacoes(j.aprovacoes ?? []);
    } catch { /* silencioso */ }
  }, [clienteId]);

  useEffect(() => { void carregarAprovacoes(); }, [carregarAprovacoes]);

  async function enviarAprovacao() {
    if (titulo.trim().length < 3 || corpo.trim().length < 3) return;
    setEnviandoApr(true);
    setMsgApr(null);
    try {
      const r = await fetch("/api/admin/aprovacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clienteId, case_id: caseId || null, titulo: titulo.trim(), corpo: corpo.trim() }),
      });
      const j = await r.json();
      if (!r.ok) { setMsgApr(j.error || "Falha ao enviar."); return; }
      setTitulo(""); setCorpo("");
      setMsgApr("✓ Enviada — o cliente decide na aba Aprovações da Sala.");
      void carregarAprovacoes();
    } catch {
      setMsgApr("Erro de conexão.");
    } finally {
      setEnviandoApr(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Enviar documento */}
      <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6 space-y-4">
        <h3 className="flex items-center gap-2 font-serif text-lg">
          <Upload className="w-4 h-4 text-[color:var(--color-brand)]" /> Enviar documento ao cliente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select className={inputCls} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {casos.length === 0 && <option value="">— sem casos —</option>}
            {casos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
          <select className={inputCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {["geral", "contrato", "relatorio", "despacho", "peticao", "nf", "balanco"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className={inputCls} value={visibilidade} onChange={(e) => setVisibilidade(e.target.value as "cliente" | "interno")}>
            <option value="cliente">Visível ao cliente</option>
            <option value="interno">Interno (só admin)</option>
          </select>
        </div>
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[color:var(--color-brand)]/40 bg-blue-50/30 px-4 py-6 cursor-pointer text-[13px] font-medium text-[color:var(--color-brand)] hover:bg-blue-50/60 transition-colors">
          {enviandoDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {enviandoDoc ? "Enviando…" : "Escolher arquivo (até 20MB)"}
          <input
            type="file"
            className="hidden"
            disabled={enviandoDoc || !caseId}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadDoc(f); e.target.value = ""; }}
          />
        </label>
        {msgDoc && <p className="text-[12px] text-[color:var(--color-ink-muted)]">{msgDoc}</p>}
      </div>

      {/* Aprovações */}
      <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6 space-y-4">
        <h3 className="flex items-center gap-2 font-serif text-lg">
          <ShieldQuestion className="w-4 h-4 text-[color:var(--color-brand)]" /> Solicitar aprovação do cliente
        </h3>
        <input className={inputCls} placeholder="Título — ex.: Autorização para ajuizar Tema 69" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea className={inputCls} rows={3} placeholder="Descreva a decisão que o cliente precisa aprovar…" value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => void enviarAprovacao()}
            disabled={enviandoApr || titulo.trim().length < 3 || corpo.trim().length < 3}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
          >
            {enviandoApr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar para aprovação
          </button>
          {msgApr && <span className="text-[12px] text-[color:var(--color-ink-muted)]">{msgApr}</span>}
        </div>

        {aprovacoes.length > 0 && (
          <div className="border-t border-[color:var(--color-hairline)] pt-3 space-y-2 max-h-56 overflow-y-auto">
            {aprovacoes.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 text-[13px]">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.titulo}</div>
                  <div className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">
                    {a.origem === "parceiro" ? `por ${a.origem_nome}` : "pela equipe"} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  {a.resposta && <div className="text-[12px] text-[color:var(--color-ink-muted)]">&ldquo;{a.resposta}&rdquo;</div>}
                </div>
                {a.status === "pendente" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-amber-700"><Clock className="w-3 h-3" />pendente</span>}
                {a.status === "aprovada" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-emerald-700"><CheckCircle2 className="w-3 h-3" />aprovada</span>}
                {a.status === "recusada" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-red-700"><XCircle className="w-3 h-3" />recusada</span>}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-[color:var(--color-ink-faint)] flex items-center gap-1.5">
          <Eye className="w-3 h-3" /> O cliente decide em Sala Arché → Aprovações; a resposta aparece aqui.
        </p>
      </div>
    </div>
  );
}
