"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSignature, Plus, Loader2, Send, Save, Paperclip, Download, ChevronLeft, AlertTriangle } from "lucide-react";

/**
 * Central do Colaborador · Minhas análises — produzir, salvar rascunho,
 * anexar evidências e enviar para revisão do Super Admin. Persistência real.
 */

interface Resumo { id: string; titulo: string; status: string; versao: number; updated_at: string; comentario_revisao: string | null; client_profiles?: { nome: string; empresa: string | null } | null }
interface Detalhe {
  analise: Record<string, string | number | null> & { id: string; status: string; versao: number; comentario_revisao: string | null };
  anexos: { id: string; nome: string; tamanho_bytes: number | null }[];
  eventos: { evento: string; detalhe: string | null; autor: string | null; created_at: string }[];
}
interface AtivRef { id: string; titulo: string }

const ST: Record<string, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "text-gray-600 border-gray-200 bg-gray-50" },
  enviada: { label: "Enviada", cls: "text-blue-700 border-blue-200 bg-blue-50" },
  em_revisao: { label: "Em revisão", cls: "text-indigo-700 border-indigo-200 bg-indigo-50" },
  ajustes_solicitados: { label: "Ajustes solicitados", cls: "text-amber-700 border-amber-200 bg-amber-50" },
  aprovada: { label: "Aprovada", cls: "text-emerald-700 border-emerald-200 bg-emerald-50" },
  arquivada: { label: "Arquivada", cls: "text-gray-500 border-gray-200 bg-gray-50" },
};

const SECOES: { campo: string; label: string; rows: number }[] = [
  { campo: "periodo_analisado", label: "Período analisado", rows: 1 },
  { campo: "objetivo", label: "Objetivo", rows: 2 },
  { campo: "dados_utilizados", label: "Fontes e dados utilizados", rows: 2 },
  { campo: "diagnostico", label: "Diagnóstico técnico", rows: 5 },
  { campo: "oportunidades", label: "Oportunidades identificadas", rows: 4 },
  { campo: "riscos", label: "Riscos e pontos de atenção", rows: 3 },
  { campo: "recomendacoes", label: "Recomendações", rows: 3 },
  { campo: "conclusao", label: "Conclusão", rows: 3 },
];

export function AnalisesColaborador() {
  const [lista, setLista] = useState<Resumo[] | null>(null);
  const [aberta, setAberta] = useState<Detalhe | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<null | "salvar" | "enviar">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoAtiv, setNovoAtiv] = useState("");
  const [ativs, setAtivs] = useState<AtivRef[]>([]);
  const [criando, setCriando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const [ra, rt] = await Promise.all([
        fetch("/api/parceiros/analises", { cache: "no-store" }),
        fetch("/api/parceiros/atividades", { cache: "no-store" }),
      ]);
      const ja = await ra.json(); setLista(ja.analises ?? []);
      const jt = await rt.json().catch(() => ({ atividades: [] }));
      setAtivs((jt.atividades ?? []).map((a: { id: string; titulo: string }) => ({ id: a.id, titulo: a.titulo })));
    } catch { setLista([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  async function abrir(id: string) {
    const r = await fetch(`/api/parceiros/analises?id=${id}`, { cache: "no-store" });
    if (!r.ok) return;
    const j: Detalhe = await r.json();
    setAberta(j);
    const campos: Record<string, string> = { titulo: String(j.analise.titulo ?? "") };
    for (const s of SECOES) campos[s.campo] = String(j.analise[s.campo] ?? "");
    setF(campos); setMsg(null);
  }

  async function criar() {
    if (novoTitulo.trim().length < 3) return;
    setCriando(true);
    const r = await fetch("/api/parceiros/analises", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: novoTitulo.trim(), atividade_id: novoAtiv || null }),
    });
    const j = await r.json();
    setCriando(false);
    if (!r.ok) { setMsg(j.error || "Falha ao criar."); return; }
    setNovoTitulo(""); setNovoAtiv("");
    await carregar(); await abrir(j.id);
  }

  async function agir(acao: "salvar" | "enviar") {
    if (!aberta) return;
    setSalvando(acao); setMsg(null);
    const r = await fetch("/api/parceiros/analises", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: aberta.analise.id, acao, ...f }),
    });
    const j = await r.json();
    setSalvando(null);
    if (!r.ok) { setMsg(j.error || "Falha."); return; }
    setMsg(acao === "enviar" ? "✓ Enviada para revisão do Super Admin." : "✓ Rascunho salvo.");
    await carregar(); await abrir(String(aberta.analise.id));
  }

  async function anexar(file: File) {
    if (!aberta) return;
    const fd = new FormData(); fd.append("file", file); fd.append("analise_id", String(aberta.analise.id));
    const r = await fetch("/api/parceiros/analises/anexos", { method: "POST", body: fd });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setMsg(j.error || "Falha no anexo."); return; }
    await abrir(String(aberta.analise.id));
  }

  if (lista === null) return null;

  const editavel = aberta && (aberta.analise.status === "rascunho" || aberta.analise.status === "ajustes_solicitados");

  return (
    <div className="mb-8 border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileSignature className="w-4 h-4 text-[color:var(--color-brand)]" />
        <span className="font-medium text-[15px]">Minhas análises</span>
        {aberta && (
          <button onClick={() => { setAberta(null); void carregar(); }} className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline">
            <ChevronLeft className="w-3 h-3" /> Voltar à lista
          </button>
        )}
      </div>

      {!aberta ? (
        <div className="space-y-4">
          {/* criar nova */}
          <div className="flex flex-wrap gap-2">
            <input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Título da nova análise — ex.: Análise tributária Empresa X" className="flex-1 min-w-[220px] border border-[color:var(--color-hairline)] bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]" />
            <select value={novoAtiv} onChange={(e) => setNovoAtiv(e.target.value)} className="border border-[color:var(--color-hairline)] bg-transparent px-2 py-2 text-[12px] focus:outline-none">
              <option value="">Vincular a uma tarefa (opcional)</option>
              {ativs.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
            </select>
            <button onClick={() => void criar()} disabled={criando || novoTitulo.trim().length < 3} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50">
              {criando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Nova análise
            </button>
          </div>
          {msg && <p className="text-[12px] text-rose-700">{msg}</p>}

          {/* lista */}
          {lista.length === 0 ? (
            <p className="text-[13px] text-[color:var(--color-ink-faint)] py-3 text-center">Nenhuma análise ainda — crie a primeira acima.</p>
          ) : (
            <div className="divide-y divide-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
              {lista.map((a) => (
                <button key={a.id} onClick={() => void abrir(a.id)} className="w-full text-left px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 hover:bg-[color:var(--color-surface)]/60">
                  <span className="flex-1 min-w-[160px] font-medium text-[13px]">{a.titulo}</span>
                  {a.client_profiles?.nome && <span className="text-[12px] text-[color:var(--color-ink-muted)]">{a.client_profiles.nome}</span>}
                  {a.versao > 1 && <span className="font-mono text-[9px] text-[color:var(--color-brand)]">rev {a.versao}</span>}
                  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${ST[a.status]?.cls || ""}`}>{ST[a.status]?.label || a.status}</span>
                  <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">{new Date(a.updated_at).toLocaleDateString("pt-BR")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* status + comentário do admin */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${ST[String(aberta.analise.status)]?.cls || ""}`}>{ST[String(aberta.analise.status)]?.label || aberta.analise.status}</span>
            {Number(aberta.analise.versao) > 1 && <span className="font-mono text-[10px] text-[color:var(--color-brand)]">revisão {aberta.analise.versao}</span>}
          </div>
          {aberta.analise.status === "ajustes_solicitados" && aberta.analise.comentario_revisao && (
            <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>Ajustes solicitados:</strong> {aberta.analise.comentario_revisao}</span>
            </div>
          )}

          {/* editor */}
          <input value={f.titulo || ""} onChange={(e) => setF((p) => ({ ...p, titulo: e.target.value }))} disabled={!editavel} className="w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2 text-[14px] font-medium focus:outline-none focus:border-[color:var(--color-brand)] disabled:opacity-60" />
          {SECOES.map((s) => (
            <div key={s.campo}>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">{s.label}</div>
              <textarea value={f[s.campo] || ""} onChange={(e) => setF((p) => ({ ...p, [s.campo]: e.target.value }))} disabled={!editavel} rows={s.rows} className="w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)] resize-y disabled:opacity-60" />
            </div>
          ))}

          {/* anexos */}
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) void anexar(x); if (fileRef.current) fileRef.current.value = ""; }} />
            {editavel && (
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[color:var(--color-hairline)] text-[11px] font-mono uppercase tracking-wider hover:border-[color:var(--color-ink)]">
                <Paperclip className="w-3 h-3" /> Anexar evidência
              </button>
            )}
            {aberta.anexos.map((x) => (
              <a key={x.id} href={`/api/parceiros/analises/anexos?baixar=${x.id}&modo=baixar`} className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-brand)] hover:underline">
                <Download className="w-3 h-3" /> {x.nome}
              </a>
            ))}
          </div>

          {msg && <p className={`text-[12px] ${msg.startsWith("✓") ? "text-emerald-700" : "text-rose-700"}`}>{msg}</p>}

          {editavel && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => void agir("salvar")} disabled={salvando !== null} className="inline-flex items-center gap-1.5 px-4 py-2 border border-[color:var(--color-hairline)] text-[12px] font-medium disabled:opacity-50">
                {salvando === "salvar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar rascunho
              </button>
              <button onClick={() => void agir("enviar")} disabled={salvando !== null} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50">
                {salvando === "enviar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar para revisão
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
