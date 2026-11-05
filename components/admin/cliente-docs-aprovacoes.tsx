"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, ShieldQuestion, CheckCircle2, XCircle, Clock, Send, Eye, FolderOpen,
} from "lucide-react";
import { DocumentosManager } from "@/components/admin/documentos-manager";

interface DocCaso {
  id: string; nome: string; storage_path: string; tamanho_bytes: number | null;
  categoria: string | null; visibilidade: string; created_at: string;
}
function fmtBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/**
 * Admin · página do cliente — enviar documentos (Storage) e
 * solicitar aprovações (o cliente decide na Sala).
 */

interface Caso { id: string; titulo: string }
interface Aprovacao {
  id: string; created_at: string; titulo: string; corpo: string;
  status: string; origem: string; origem_nome: string | null;
  resposta: string | null; respondido_em: string | null;
  ajuste_motivo?: string | null; protocolo?: string | null;
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

  /* ---------- documentos já enviados (gerenciar) ---------- */
  const [docs, setDocs] = useState<DocCaso[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  const carregarDocs = useCallback(async () => {
    if (!caseId) { setDocs([]); return; }
    try {
      const r = await fetch(`/api/admin/clientes/documentos?case_id=${caseId}`, { cache: "no-store" });
      if (r.ok) { const j = await r.json(); setDocs(j.documentos ?? []); }
    } catch { /* silencioso */ }
  }, [caseId]);

  useEffect(() => { void carregarDocs(); }, [carregarDocs]);

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
      if (r.ok) void carregarDocs();
    } catch {
      setMsgDoc("Erro de conexão.");
    } finally {
      setEnviandoDoc(false);
    }
  }

  async function salvarNome(d: DocCaso) {
    const nome = editNome.trim();
    setEditId(null);
    if (!nome || nome === d.nome) return;
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, nome } : x)));
    await fetch("/api/admin/clientes/documentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id, nome }) });
  }
  async function mudarVisibilidade(d: DocCaso) {
    const nova = d.visibilidade === "cliente" ? "interno" : "cliente";
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, visibilidade: nova } : x)));
    await fetch("/api/admin/clientes/documentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id, visibilidade: nova }) });
  }
  async function excluirDoc(d: DocCaso) {
    if (!confirm(`Arquivar "${d.nome}"? Ele sai da Sala do cliente e desta lista, mas o arquivo é preservado e a ação fica registrada na trilha de auditoria.`)) return;
    const r = await fetch(`/api/admin/clientes/documentos?id=${d.id}`, { method: "DELETE" });
    if (r.ok) setDocs((prev) => prev.filter((x) => x.id !== d.id));
  }

  /* ---------- aprovações ---------- */
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [enviandoApr, setEnviandoApr] = useState(false);
  const [msgApr, setMsgApr] = useState<string | null>(null);
  const [aprMais, setAprMais] = useState(false);
  const [aprF, setAprF] = useState<Record<string, string>>({});
  const setAF = (k: string, v: string) => setAprF((p) => ({ ...p, [k]: v }));

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
        body: JSON.stringify({
          client_id: clienteId, case_id: caseId || null, titulo: titulo.trim(), corpo: corpo.trim(),
          valor_credito: aprF.valor_credito || null,
          tributos: aprF.tributos || null,
          periodo_apuracao: aprF.periodo_apuracao || null,
          modalidade: aprF.modalidade || null,
          inicio_previsto: aprF.inicio_previsto || null,
          impacto_caixa: aprF.impacto_caixa || null,
          fundamentacao: aprF.fundamentacao || null,
          risco: aprF.risco || null,
          honorarios: aprF.honorarios || null,
          prazo_decisao: aprF.prazo_decisao || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setMsgApr(j.error || "Falha ao enviar."); return; }
      setTitulo(""); setCorpo(""); setAprF({});
      setMsgApr("✓ Enviada — o cliente decide na aba Aprovações da Sala.");
      void carregarAprovacoes();
    } catch {
      setMsgApr("Erro de conexão.");
    } finally {
      setEnviandoApr(false);
    }
  }

  async function reapresentar(id: string) {
    if (!confirm("Reapresentar esta aprovação ao cliente? Ela volta a ficar pendente (nova revisão).")) return;
    const r = await fetch("/api/admin/aprovacoes", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, acao: "reapresentar" }),
    });
    if (r.ok) void carregarAprovacoes();
    else { const j = await r.json().catch(() => ({})); alert(j.error || "Falha ao reapresentar."); }
  }

  return (
    <div className="space-y-6">
    {/* Documentos — gerenciador profissional */}
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6">
      <h3 className="flex items-center gap-2 font-serif text-lg mb-4">
        <FolderOpen className="w-4 h-4 text-[color:var(--color-brand)]" /> Documentos
      </h3>
      <DocumentosManager casos={casos} />
    </div>

      {/* Aprovações */}
      <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6 space-y-4">
        <h3 className="flex items-center gap-2 font-serif text-lg">
          <ShieldQuestion className="w-4 h-4 text-[color:var(--color-brand)]" /> Solicitar aprovação do cliente
        </h3>
        <select className={inputCls} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
          {casos.length === 0 && <option value="">— sem casos —</option>}
          {casos.map((c) => <option key={c.id} value={c.id}>Caso: {c.titulo}</option>)}
        </select>
        <input className={inputCls} placeholder="Título — ex.: Autorização para ajuizar Tema 69" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea className={inputCls} rows={3} placeholder="Descreva a decisão que o cliente precisa aprovar…" value={corpo} onChange={(e) => setCorpo(e.target.value)} />

        <button type="button" onClick={() => setAprMais((v) => !v)} className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline">
          {aprMais ? "− Menos detalhes" : "+ Adicionar detalhes (valor, tributos, risco, honorários, prazo…)"}
        </button>
        {aprMais && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border border-[color:var(--color-hairline)] p-3">
            <input className={inputCls} placeholder="Valor do crédito (R$)" value={aprF.valor_credito || ""} onChange={(e) => setAF("valor_credito", e.target.value)} />
            <input className={inputCls} placeholder="Tributos — ex.: PIS e COFINS" value={aprF.tributos || ""} onChange={(e) => setAF("tributos", e.target.value)} />
            <input className={inputCls} placeholder="Período apurado — ex.: mar/2017 a fev/2022" value={aprF.periodo_apuracao || ""} onChange={(e) => setAF("periodo_apuracao", e.target.value)} />
            <input className={inputCls} placeholder="Modalidade — ex.: Compensação via PER/DCOMP" value={aprF.modalidade || ""} onChange={(e) => setAF("modalidade", e.target.value)} />
            <input className={inputCls} placeholder="Início previsto — ex.: novembro/2026" value={aprF.inicio_previsto || ""} onChange={(e) => setAF("inicio_previsto", e.target.value)} />
            <input className={inputCls} placeholder="Impacto no caixa" value={aprF.impacto_caixa || ""} onChange={(e) => setAF("impacto_caixa", e.target.value)} />
            <input className={inputCls} placeholder="Honorários — ex.: 18% sobre o compensado" value={aprF.honorarios || ""} onChange={(e) => setAF("honorarios", e.target.value)} />
            <select className={inputCls} value={aprF.risco || ""} onChange={(e) => setAF("risco", e.target.value)}>
              <option value="">Risco (opcional)</option>
              <option value="baixo">Baixo</option>
              <option value="medio">Médio</option>
              <option value="alto">Alto</option>
            </select>
            <input className={`${inputCls} sm:col-span-2`} placeholder="Fundamentação — ex.: RE 574.706 — Tema 69/STF" value={aprF.fundamentacao || ""} onChange={(e) => setAF("fundamentacao", e.target.value)} />
            <label className="sm:col-span-2 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink-muted)] flex items-center gap-2">
              Prazo p/ decisão
              <input type="datetime-local" className={inputCls} value={aprF.prazo_decisao || ""} onChange={(e) => setAF("prazo_decisao", e.target.value)} />
            </label>
          </div>
        )}
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
                  {a.status === "ajuste_solicitado" && a.ajuste_motivo && <div className="text-[12px] text-amber-800">Ajuste pedido: &ldquo;{a.ajuste_motivo}&rdquo;</div>}
                  {a.status === "aprovada" && a.protocolo && <div className="font-mono text-[10px] text-emerald-700">protocolo {a.protocolo}</div>}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {a.status === "pendente" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-amber-700"><Clock className="w-3 h-3" />pendente</span>}
                  {a.status === "aprovada" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-emerald-700"><CheckCircle2 className="w-3 h-3" />aprovada</span>}
                  {a.status === "recusada" && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-red-700"><XCircle className="w-3 h-3" />recusada</span>}
                  {a.status === "ajuste_solicitado" && (
                    <>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-amber-700">ajuste</span>
                      <button onClick={() => void reapresentar(a.id)} className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-brand)] hover:underline">reapresentar</button>
                    </>
                  )}
                </div>
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
