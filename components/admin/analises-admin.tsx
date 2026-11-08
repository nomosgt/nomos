"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSignature, Loader2, CheckCircle2, AlertTriangle, Eye, Download, ChevronLeft, Archive, History } from "lucide-react";

/** Admin · Análises da Equipe — revisar, comentar, aprovar, solicitar ajustes. */

interface Resumo {
  id: string; titulo: string; status: string; versao: number; enviada_em: string | null;
  updated_at: string; parceiro_nome: string | null; comentario_revisao: string | null;
  client_profiles?: { nome: string; empresa: string | null } | null;
  client_cases?: { titulo: string } | null;
}
interface Detalhe {
  analise: Record<string, string | number | null> & { id: string; status: string; versao: number };
  anexos: { id: string; nome: string; uploader_nome: string | null }[];
  eventos: { evento: string; detalhe: string | null; autor: string | null; created_at: string }[];
  versoes: { id: string; titulo: string; versao: number; status: string; created_at: string }[];
}

const ST: Record<string, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "text-gray-600 border-gray-200 bg-gray-50" },
  enviada: { label: "Enviada", cls: "text-blue-700 border-blue-200 bg-blue-50" },
  em_revisao: { label: "Em revisão", cls: "text-indigo-700 border-indigo-200 bg-indigo-50" },
  ajustes_solicitados: { label: "Ajustes solicitados", cls: "text-amber-700 border-amber-200 bg-amber-50" },
  aprovada: { label: "Aprovada", cls: "text-emerald-700 border-emerald-200 bg-emerald-50" },
  arquivada: { label: "Arquivada", cls: "text-gray-500 border-gray-200 bg-gray-50" },
};
const CAMPOS: { campo: string; label: string }[] = [
  { campo: "periodo_analisado", label: "Período analisado" },
  { campo: "objetivo", label: "Objetivo" },
  { campo: "dados_utilizados", label: "Fontes e dados" },
  { campo: "diagnostico", label: "Diagnóstico técnico" },
  { campo: "oportunidades", label: "Oportunidades" },
  { campo: "riscos", label: "Riscos" },
  { campo: "recomendacoes", label: "Recomendações" },
  { campo: "conclusao", label: "Conclusão" },
];

export function AnalisesAdmin() {
  const [lista, setLista] = useState<Resumo[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState("");
  const [aberta, setAberta] = useState<Detalhe | null>(null);
  const [comentario, setComentario] = useState("");
  const [agindo, setAgindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const sp = new URLSearchParams(); if (fStatus) sp.set("status", fStatus);
      const r = await fetch(`/api/admin/analises?${sp}`, { cache: "no-store" });
      const j = await r.json();
      setLista(j.analises ?? []); setAviso(j.aviso ?? null);
    } catch { setLista([]); }
  }, [fStatus]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { const t = setInterval(() => void carregar(), 45000); return () => clearInterval(t); }, [carregar]);

  async function abrir(id: string) {
    const r = await fetch(`/api/admin/analises?id=${id}`, { cache: "no-store" });
    if (r.ok) { setAberta(await r.json()); setComentario(""); setErro(null); }
  }

  async function agir(acao: string) {
    if (!aberta) return;
    if (acao === "aprovar" && !confirm("Aprovar esta análise? A versão aprovada fica preservada e imutável.")) return;
    setAgindo(acao); setErro(null);
    const r = await fetch("/api/admin/analises", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: aberta.analise.id, acao, comentario: comentario.trim() || undefined }),
    });
    const j = await r.json();
    setAgindo(null);
    if (!r.ok) { setErro(j.error || "Falha."); return; }
    await abrir(String(aberta.analise.id)); await carregar();
  }

  if (lista === null) return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[color:var(--color-ink-faint)]" /></div>;

  if (aberta) {
    const a = aberta.analise;
    const podeDecidir = a.status === "enviada" || a.status === "em_revisao";
    return (
      <div className="space-y-4">
        <button onClick={() => setAberta(null)} className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline">
          <ChevronLeft className="w-3 h-3" /> Voltar
        </button>
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl">{a.titulo}</h2>
              <div className="text-[12px] text-[color:var(--color-ink-muted)] mt-0.5">
                por <strong>{a.parceiro_nome || "—"}</strong>
                {a.enviada_em ? <> · enviada em {new Date(String(a.enviada_em)).toLocaleString("pt-BR")}</> : null}
                {Number(a.versao) > 1 && <> · revisão {a.versao}</>}
              </div>
            </div>
            <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${ST[String(a.status)]?.cls || ""}`}>{ST[String(a.status)]?.label || a.status}</span>
          </div>

          {CAMPOS.map((c) => a[c.campo] ? (
            <div key={c.campo}>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">{c.label}</div>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{a[c.campo]}</p>
            </div>
          ) : null)}

          {aberta.anexos.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-[color:var(--color-hairline)] pt-3">
              {aberta.anexos.map((x) => (
                <a key={x.id} href={`/api/admin/analises?baixar=${x.id}&modo=baixar`} className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-brand)] hover:underline">
                  <Download className="w-3 h-3" /> {x.nome}
                </a>
              ))}
            </div>
          )}

          {/* ações */}
          {(podeDecidir || a.status === "aprovada") && (
            <div className="border-t border-[color:var(--color-hairline)] pt-4 space-y-2">
              {podeDecidir && (
                <>
                  <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} placeholder="Comentário de revisão (obrigatório ao solicitar ajustes)…" className="w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)] resize-y" />
                  {erro && <p className="text-[12px] text-rose-700">{erro}</p>}
                  <div className="flex flex-wrap gap-2">
                    {a.status === "enviada" && (
                      <button onClick={() => void agir("iniciar_revisao")} disabled={agindo !== null} className="inline-flex items-center gap-1.5 px-4 py-2 border border-[color:var(--color-brand)] text-[color:var(--color-brand)] text-[12px] font-medium disabled:opacity-50">
                        <Eye className="w-3.5 h-3.5" /> Iniciar revisão
                      </button>
                    )}
                    <button onClick={() => void agir("ajustes")} disabled={agindo !== null} className="inline-flex items-center gap-1.5 px-4 py-2 border border-amber-400 text-amber-800 text-[12px] font-medium disabled:opacity-50">
                      {agindo === "ajustes" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />} Solicitar ajustes
                    </button>
                    <button onClick={() => void agir("aprovar")} disabled={agindo !== null} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-[12px] font-medium disabled:opacity-50">
                      {agindo === "aprovar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Aprovar
                    </button>
                  </div>
                </>
              )}
              {a.status === "aprovada" && (
                <button onClick={() => void agir("arquivar")} disabled={agindo !== null} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[color:var(--color-hairline)] text-[11px] font-mono uppercase tracking-wider disabled:opacity-50">
                  <Archive className="w-3 h-3" /> Arquivar
                </button>
              )}
            </div>
          )}

          {/* versões anteriores + eventos */}
          {aberta.versoes.length > 0 && (
            <div className="text-[12px] text-[color:var(--color-ink-muted)]">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mr-2">Versões anteriores:</span>
              {aberta.versoes.map((v) => (
                <button key={v.id} onClick={() => void abrir(v.id)} className="mr-2 text-[color:var(--color-brand)] hover:underline">rev {v.versao} ({ST[v.status]?.label})</button>
              ))}
            </div>
          )}
          {aberta.eventos.length > 0 && (
            <div className="border-t border-[color:var(--color-hairline)] pt-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1.5 flex items-center gap-1"><History className="w-3 h-3" /> Histórico</div>
              <div className="space-y-0.5 max-h-36 overflow-y-auto">
                {aberta.eventos.map((e, i) => (
                  <div key={i} className="text-[11.5px] text-[color:var(--color-ink-muted)]">
                    <strong>{e.evento}</strong>{e.detalhe && <> — {e.detalhe}</>} · {e.autor || "—"} · {new Date(e.created_at).toLocaleString("pt-BR")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const pendentes = lista.filter((x) => x.status === "enviada" || x.status === "em_revisao").length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-[color:var(--color-ink-muted)]">
          {pendentes > 0 ? <strong className="text-amber-700">{pendentes} aguardando sua revisão</strong> : "Nenhuma pendência de revisão."}
        </span>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="ml-auto border border-[color:var(--color-hairline)] bg-transparent px-2 py-1.5 text-[12px] focus:outline-none">
          <option value="">Todos os status</option>
          {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {aviso && <div className="text-[12px] text-amber-700 border border-amber-200 bg-amber-50 px-3 py-2">{aviso}</div>}
      <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
        {lista.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-[color:var(--color-ink-faint)]">
            <FileSignature className="w-5 h-5 mx-auto mb-2 opacity-50" />
            Nenhuma análise ainda. Os colaboradores produzem na Central deles.
          </div>
        ) : lista.map((a) => (
          <button key={a.id} onClick={() => void abrir(a.id)} className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-[color:var(--color-surface)]/60">
            <span className="flex-1 min-w-[180px] font-medium text-[13.5px]">{a.titulo}</span>
            <span className="text-[12px] text-[color:var(--color-ink-muted)]">{a.parceiro_nome || "—"}</span>
            {a.client_profiles?.nome && <span className="text-[12px] text-[color:var(--color-ink-faint)]">· {a.client_profiles.nome}</span>}
            {a.versao > 1 && <span className="font-mono text-[9px] text-[color:var(--color-brand)]">rev {a.versao}</span>}
            <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${ST[a.status]?.cls || ""}`}>{ST[a.status]?.label || a.status}</span>
            <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">{new Date(a.updated_at).toLocaleDateString("pt-BR")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
