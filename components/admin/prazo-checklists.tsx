"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock, ClipboardCheck, Plus, Trash2, Loader2, ExternalLink, X,
} from "lucide-react";

/**
 * Admin · Prazo & Checklists de UM colaborador.
 * - Deadline único por pessoa (data + hora), vira alerta na Central dele.
 * - Checklists com N itens; o colaborador marca e anexa — o progresso
 *   aparece aqui (atualiza ao abrir e a cada 15s).
 */

interface Item {
  id: string; ordem: number; texto: string; feito: boolean;
  feito_em: string | null; anexo_path: string | null; anexo_nome: string | null;
}
interface Checklist { id: string; titulo: string; criado_em: string; itens: Item[] }
interface Deadline { titulo: string | null; prazo: string; updated_at: string }

const inputCls =
  "w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";

/** ISO → valor de <input type=datetime-local> no fuso local. */
function isoParaLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PrazoChecklists({ parceiroId }: { parceiroId: string }) {
  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // form deadline
  const [prazoLocal, setPrazoLocal] = useState("");
  const [tituloPrazo, setTituloPrazo] = useState("");

  // form checklist
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novosItens, setNovosItens] = useState<string[]>(["", "", ""]);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/parceiros/tarefas?parceiro_id=${parceiroId}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        if ((j as { error?: string }).error?.includes("tarefas-v7")) setMsg((j as { error: string }).error);
        return;
      }
      const j = await r.json();
      setDeadline(j.deadline ?? null);
      setChecklists(j.checklists ?? []);
      if (j.deadline) {
        setPrazoLocal(isoParaLocal(j.deadline.prazo));
        setTituloPrazo(j.deadline.titulo ?? "");
      }
    } catch { /* silencioso */ } finally {
      setCarregado(true);
    }
  }, [parceiroId]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 15000); // progresso "ao vivo"
    return () => clearInterval(t);
  }, [carregar]);

  async function salvarPrazo(remover = false) {
    setSalvando(true);
    setMsg(null);
    try {
      const body = remover
        ? { parceiro_id: parceiroId, deadline: null }
        : { parceiro_id: parceiroId, deadline: { titulo: tituloPrazo, prazo: new Date(prazoLocal).toISOString() } };
      if (!remover && (!prazoLocal || isNaN(new Date(prazoLocal).getTime()))) {
        setMsg("Defina data e hora válidas.");
        return;
      }
      const r = await fetch("/api/admin/parceiros/tarefas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Falha ao salvar."); return; }
      if (remover) { setPrazoLocal(""); setTituloPrazo(""); }
      setMsg(remover ? "Prazo removido." : "✓ Prazo salvo — o colaborador já vê o alerta na Central.");
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function criarChecklist() {
    const itens = novosItens.map((t) => t.trim()).filter(Boolean);
    if (novoTitulo.trim().length < 2 || itens.length === 0) {
      setMsg("Dê um título e pelo menos 1 item.");
      return;
    }
    setSalvando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/parceiros/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parceiro_id: parceiroId, titulo: novoTitulo.trim(), itens }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Falha ao criar."); return; }
      setNovoTitulo("");
      setNovosItens(["", "", ""]);
      setMsg("✓ Checklist enviado ao colaborador.");
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluirChecklist(id: string) {
    if (!confirm("Excluir este checklist (e o progresso do colaborador)?")) return;
    const r = await fetch(`/api/admin/parceiros/tarefas?checklist_id=${id}`, { method: "DELETE" });
    if (r.ok) setChecklists((prev) => prev.filter((c) => c.id !== id));
  }

  if (!carregado) {
    return (
      <div className="flex items-center gap-2 text-[color:var(--color-ink-faint)] text-[12px] py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando prazo e checklists…
      </div>
    );
  }

  return (
    <div className="border border-[color:var(--color-accent)]/30 bg-amber-50/20 p-4 space-y-5">
      {/* ── Prazo / deadline ── */}
      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-accent-dim)] mb-2">
          <CalendarClock className="w-3.5 h-3.5" />
          Prazo (deadline) — alerta na Central do colaborador
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">
              Data e hora limite
            </label>
            <input
              type="datetime-local"
              className={inputCls}
              value={prazoLocal}
              onChange={(e) => setPrazoLocal(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">
              Título (opcional)
            </label>
            <input
              className={inputCls}
              placeholder="Ex.: Entrega da memória de cálculo"
              value={tituloPrazo}
              onChange={(e) => setTituloPrazo(e.target.value)}
            />
          </div>
          <button
            onClick={() => void salvarPrazo(false)}
            disabled={salvando || !prazoLocal}
            className="px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {deadline ? "Atualizar prazo" : "Definir prazo"}
          </button>
          {deadline && (
            <button
              onClick={() => void salvarPrazo(true)}
              disabled={salvando}
              className="px-3 py-2 border border-red-300 text-red-700 text-[12px] hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
              title="Remover prazo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {deadline && (
          <p className="mt-1.5 text-[11px] text-[color:var(--color-ink-muted)]">
            Ativo: {new Date(deadline.prazo).toLocaleDateString("pt-BR")} às{" "}
            {new Date(deadline.prazo).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {new Date(deadline.prazo).getTime() < Date.now() && (
              <span className="ml-2 font-mono text-[10px] uppercase text-red-700">vencido</span>
            )}
          </p>
        )}
      </div>

      {/* ── Checklists existentes (progresso ao vivo) ── */}
      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-accent-dim)] mb-2">
          <ClipboardCheck className="w-3.5 h-3.5" />
          Checklists do colaborador
        </div>
        {checklists.length === 0 && (
          <p className="text-[12px] text-[color:var(--color-ink-faint)] mb-2">Nenhum checklist ainda.</p>
        )}
        <div className="space-y-3">
          {checklists.map((c) => {
            const feitos = c.itens.filter((i) => i.feito).length;
            const completo = feitos === c.itens.length && c.itens.length > 0;
            return (
              <div key={c.id} className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-[13px]">{c.titulo}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[11px] px-2 py-0.5 border ${
                      completo
                        ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                        : "text-[color:var(--color-ink-muted)] border-[color:var(--color-hairline)]"
                    }`}>
                      {feitos}/{c.itens.length}
                    </span>
                    <button
                      onClick={() => void excluirChecklist(c.id)}
                      className="text-[color:var(--color-ink-faint)] hover:text-red-700"
                      title="Excluir checklist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-1 bg-[color:var(--color-hairline)] mb-2.5">
                  <div
                    className={`h-1 transition-all ${completo ? "bg-emerald-600" : "bg-[color:var(--color-brand)]"}`}
                    style={{ width: `${c.itens.length ? (feitos / c.itens.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {c.itens.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className={i.feito ? "text-emerald-700" : "text-[color:var(--color-ink-faint)]"}>
                        {i.feito ? "✓" : "○"}
                      </span>
                      <span className={`flex-1 ${i.feito ? "text-[color:var(--color-ink-muted)] line-through" : "text-[color:var(--color-ink)]"}`}>
                        {i.texto}
                      </span>
                      {i.feito_em && (
                        <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">
                          {new Date(i.feito_em).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {i.anexo_path && (
                        <a
                          href={`/api/parceiros/arquivo?path=${encodeURIComponent(i.anexo_path)}&modo=ver`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-brand)] hover:underline underline-offset-2"
                          title={i.anexo_nome || "Abrir anexo"}
                        >
                          <ExternalLink className="w-3 h-3" /> anexo
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Criar checklist ── */}
      <div className="border-t border-[color:var(--color-hairline)] pt-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
          Novo checklist
        </div>
        <input
          className={`${inputCls} mb-2`}
          placeholder="Título do checklist — ex.: Protocolo Tema 69 · Fase 1"
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
        />
        <div className="space-y-2">
          {novosItens.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] w-5 text-right">{idx + 1}.</span>
              <input
                className={inputCls}
                placeholder={`Item ${idx + 1}`}
                value={item}
                onChange={(e) => setNovosItens((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))}
              />
              {novosItens.length > 1 && (
                <button
                  onClick={() => setNovosItens((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[color:var(--color-ink-faint)] hover:text-red-700 flex-shrink-0"
                  title="Remover item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button
            onClick={() => setNovosItens((prev) => [...prev, ""])}
            disabled={novosItens.length >= 40}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[color:var(--color-hairline)] text-[12px] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)] disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </button>
          <button
            onClick={() => void criarChecklist()}
            disabled={salvando || novoTitulo.trim().length < 2 || !novosItens.some((t) => t.trim())}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
            Enviar checklist
          </button>
        </div>
      </div>

      {msg && <p className="text-[12px] text-[color:var(--color-ink-muted)]">{msg}</p>}
    </div>
  );
}
