"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ClipboardCheck, Paperclip, Loader2, ExternalLink,
} from "lucide-react";

/**
 * Tarefas da Arché — prazo (alerta, sem countdown) e checklists definidos
 * pelo admin. O colaborador marca os itens e pode anexar arquivos; tudo
 * reflete em tempo real no painel admin.
 */

interface Item {
  id: string; ordem: number; texto: string; feito: boolean;
  feito_em: string | null; anexo_path: string | null; anexo_nome: string | null;
}
interface Checklist { id: string; titulo: string; criado_em: string; itens: Item[] }
interface Deadline { titulo: string | null; prazo: string; updated_at: string }

function fmtPrazo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function TarefasArche() {
  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [anexando, setAnexando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemAlvo = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/parceiros/tarefas", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setDeadline(j.deadline ?? null);
      setChecklists(j.checklists ?? []);
    } catch { /* offline — segue sem a seção */ } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function toggle(item: Item) {
    // otimista
    setChecklists((prev) => prev.map((c) => ({
      ...c,
      itens: c.itens.map((i) => (i.id === item.id ? { ...i, feito: !item.feito } : i)),
    })));
    const r = await fetch("/api/parceiros/tarefas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id, feito: !item.feito }),
    });
    if (!r.ok) void carregar(); // reverte pro estado real
  }

  function pedirAnexo(itemId: string) {
    itemAlvo.current = itemId;
    fileRef.current?.click();
  }

  async function anexar(file: File) {
    const itemId = itemAlvo.current;
    if (!itemId) return;
    setAnexando(itemId);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/parceiros/upload", { method: "POST", body: fd });
      const uj = await up.json();
      if (!up.ok) { setErro(uj.error || "Falha no upload."); return; }
      const r = await fetch("/api/parceiros/tarefas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, anexo_path: uj.path, anexo_nome: uj.nome }),
      });
      if (!r.ok) { setErro("Falha ao vincular o anexo."); return; }
      void carregar();
    } catch {
      setErro("Erro de conexão no anexo.");
    } finally {
      setAnexando(null);
      itemAlvo.current = null;
    }
  }

  if (!carregado || (!deadline && checklists.length === 0)) return null;

  const vencido = deadline ? new Date(deadline.prazo).getTime() < Date.now() : false;

  return (
    <div className="mb-8 space-y-4">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void anexar(f); e.target.value = ""; }}
      />

      {/* Alerta de prazo — sem countdown, direto ao ponto */}
      {deadline && (
        <div className={`flex items-start gap-3 border-l-4 p-4 ${
          vencido
            ? "border-red-600 bg-red-50"
            : "border-amber-500 bg-amber-50"
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${vencido ? "text-red-700" : "text-amber-700"}`} />
          <div>
            <div className={`text-[14px] font-semibold ${vencido ? "text-red-900" : "text-amber-900"}`}>
              {vencido ? "Prazo expirado" : "Prazo definido pela Arché"}
              {deadline.titulo ? ` — ${deadline.titulo}` : ""}
            </div>
            <div className={`text-[13px] ${vencido ? "text-red-800" : "text-amber-800"}`}>
              {vencido ? "Venceu em " : "Entrega até "}
              <strong>{fmtPrazo(deadline.prazo)}</strong>
              {vencido ? " — fale com a equipe Arché." : "."}
            </div>
          </div>
        </div>
      )}

      {/* Checklists */}
      {checklists.map((c) => {
        const feitos = c.itens.filter((i) => i.feito).length;
        const completo = feitos === c.itens.length && c.itens.length > 0;
        return (
          <div key={c.id} className="border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[color:var(--color-brand)]" />
                <span className="font-medium text-[14px]">{c.titulo}</span>
              </div>
              <span className={`font-mono text-[11px] px-2 py-0.5 border ${
                completo
                  ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                  : "text-[color:var(--color-ink-muted)] border-[color:var(--color-hairline)]"
              }`}>
                {feitos}/{c.itens.length}
              </span>
            </div>
            {/* barra de progresso */}
            <div className="h-1 bg-[color:var(--color-hairline)] mb-4">
              <div
                className={`h-1 transition-all ${completo ? "bg-emerald-600" : "bg-[color:var(--color-brand)]"}`}
                style={{ width: `${c.itens.length ? (feitos / c.itens.length) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-2">
              {c.itens.map((i) => (
                <div key={i.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={i.feito}
                    onChange={() => void toggle(i)}
                    className="mt-0.5 w-4 h-4 accent-[color:var(--color-brand)] cursor-pointer"
                    id={`chk-${i.id}`}
                  />
                  <label htmlFor={`chk-${i.id}`} className={`flex-1 text-[13.5px] cursor-pointer ${i.feito ? "line-through text-[color:var(--color-ink-faint)]" : "text-[color:var(--color-ink)]"}`}>
                    {i.texto}
                  </label>
                  {i.anexo_path ? (
                    <a
                      href={`/api/parceiros/arquivo?path=${encodeURIComponent(i.anexo_path)}&modo=ver`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-brand)] hover:underline underline-offset-2 flex-shrink-0"
                      title={i.anexo_nome || "Abrir anexo"}
                    >
                      <ExternalLink className="w-3 h-3" /> {i.anexo_nome?.slice(0, 18) || "anexo"}
                    </a>
                  ) : (
                    <button
                      onClick={() => pedirAnexo(i.id)}
                      disabled={anexando === i.id}
                      className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)] flex-shrink-0"
                      title="Anexar arquivo a este item"
                    >
                      {anexando === i.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                      anexar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {erro && <p className="text-[12px] text-red-700">{erro}</p>}
    </div>
  );
}
