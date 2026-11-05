"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Upload, Trash2, Eye, Download, Loader2, Eye as EyeIcon, Lock } from "lucide-react";

/**
 * Gerenciador de anexos de uma atividade — reutilizado no admin e na Central da Advogada.
 * `base` é o endpoint de anexos (/api/admin/atividades/anexos ou /api/parceiros/atividades/anexos).
 * Upload com visibilidade por arquivo (cliente/interno); excluir = arquivar (preserva).
 */

interface Anexo {
  id: string;
  nome: string;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  visibilidade: "cliente" | "interno";
  uploader_nome: string | null;
  created_at: string;
}

function fmtBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AnexosAtividade({ atividadeId, base, podeCliente = true }: { atividadeId: string; base: string; podeCliente?: boolean }) {
  const [anexos, setAnexos] = useState<Anexo[] | null>(null);
  const [visib, setVisib] = useState<"interno" | "cliente">("interno");
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`${base}?atividade_id=${atividadeId}`, { cache: "no-store" });
      if (!r.ok) { setAnexos([]); return; }
      const j = await r.json();
      setAnexos(j.anexos ?? []);
    } catch { setAnexos([]); }
  }, [base, atividadeId]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function subir(file: File) {
    setErro(null);
    if (file.size > 20 * 1024 * 1024) { setErro("Arquivo acima de 20MB."); return; }
    setSubindo(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("atividade_id", atividadeId);
    fd.append("visibilidade", visib);
    try {
      const r = await fetch(base, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro(j.error || "Falha ao enviar.");
      else await carregar();
    } catch { setErro("Falha de rede."); }
    setSubindo(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function arquivar(a: Anexo) {
    if (!confirm(`Arquivar "${a.nome}"? Sai da lista (e da Sala do cliente, se visível), mas o arquivo é preservado.`)) return;
    const r = await fetch(`${base}?id=${a.id}`, { method: "DELETE" });
    if (r.ok) setAnexos((prev) => (prev ?? []).filter((x) => x.id !== a.id));
  }

  if (anexos === null) return <div className="text-[11px] text-[color:var(--color-ink-faint)] py-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Carregando anexos…</div>;

  return (
    <div className="mt-3 border-t border-[color:var(--color-hairline)] pt-3">
      <div className="flex items-center gap-2 mb-2">
        <Paperclip className="w-3.5 h-3.5 text-[color:var(--color-ink-muted)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]">
          Anexos {anexos.length > 0 && `(${anexos.length})`}
        </span>
      </div>

      {anexos.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-[12px] border border-[color:var(--color-hairline)] px-2.5 py-1.5">
              <span className="flex-1 min-w-0 truncate" title={a.nome}>{a.nome}</span>
              <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border inline-flex items-center gap-1 ${a.visibilidade === "cliente" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-gray-600 border-gray-200 bg-gray-50"}`}>
                {a.visibilidade === "cliente" ? <EyeIcon className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {a.visibilidade === "cliente" ? "Cliente" : "Interno"}
              </span>
              <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] hidden sm:inline">{fmtBytes(a.tamanho_bytes)}</span>
              <a href={`${base}?baixar=${a.id}&modo=ver`} target="_blank" rel="noopener noreferrer" title="Abrir" className="p-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]"><Eye className="w-3.5 h-3.5" /></a>
              <a href={`${base}?baixar=${a.id}&modo=baixar`} title="Baixar" className="p-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]"><Download className="w-3.5 h-3.5" /></a>
              <button onClick={() => void arquivar(a)} title="Arquivar" className="p-1 text-[color:var(--color-ink-faint)] hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void subir(f); }} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subindo}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[color:var(--color-hairline)] text-[11px] font-mono uppercase tracking-wider hover:border-[color:var(--color-ink)] disabled:opacity-60"
        >
          {subindo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {subindo ? "Enviando…" : "Anexar arquivo"}
        </button>
        {podeCliente && (
          <label className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--color-ink-muted)]">
            <span className="font-mono uppercase text-[9px] tracking-wider">Visível para:</span>
            <select value={visib} onChange={(e) => setVisib(e.target.value as "interno" | "cliente")} className="border border-[color:var(--color-hairline)] text-[11px] p-1 focus:outline-none">
              <option value="interno">Só equipe (interno)</option>
              <option value="cliente">Cliente (aparece na Sala)</option>
            </select>
          </label>
        )}
      </div>
      {erro && <div className="mt-2 text-[11px] text-rose-700">{erro}</div>}
    </div>
  );
}
