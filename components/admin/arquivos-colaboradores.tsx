"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FolderOpen, FileText, FileSpreadsheet, FileImage, FileArchive,
  File as FileIcon, Download, ExternalLink, Search, ChevronDown, Loader2,
} from "lucide-react";

/**
 * Admin · Arquivos — todos os documentos de todos os colaboradores,
 * direto do Storage (inclui uploads do drive e anexos de projetos).
 */

interface Arquivo { path: string; nome: string; tamanho: number | null; criado_em: string | null }
interface ParceiroArquivos {
  parceiro_id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  arquivos: Arquivo[];
}

function iconePor(nome: string) {
  const ext = nome.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return FileImage;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["zip", "rar", "7z"].includes(ext)) return FileArchive;
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return FileText;
  return FileIcon;
}

function fmtTamanho(b: number | null): string {
  if (b == null) return "";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

function fmtData(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

export function ArquivosColaboradores() {
  const [dados, setDados] = useState<ParceiroArquivos[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/parceiros/arquivos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (alive) setDados(j.parceiros ?? []); })
      .catch(() => { if (alive) setErro("Não foi possível carregar os arquivos."); });
    return () => { alive = false; };
  }, []);

  const filtrados = useMemo(() => {
    if (!dados) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return dados;
    return dados
      .map((p) => ({
        ...p,
        arquivos: p.arquivos.filter(
          (a) => a.nome.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q),
        ),
      }))
      .filter((p) => p.nome.toLowerCase().includes(q) || p.arquivos.length > 0);
  }, [dados, busca]);

  const totalArquivos = (dados ?? []).reduce((s, p) => s + p.arquivos.length, 0);

  if (erro) return <p className="text-[13px] text-red-700">{erro}</p>;
  if (dados === null) {
    return (
      <div className="flex items-center gap-3 text-[color:var(--color-ink-faint)] py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Carregando arquivos…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">
          {dados.length} colaborador{dados.length !== 1 ? "es" : ""} · {totalArquivos} arquivo{totalArquivos !== 1 ? "s" : ""}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
          <input
            className="w-full border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]"
            placeholder="Buscar por arquivo ou colaborador…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-10 text-[13px] text-[color:var(--color-ink-faint)]">
          {busca ? "Nada encontrado para essa busca." : "Nenhum colaborador cadastrado ainda."}
        </div>
      ) : (
        filtrados.map((p) => {
          const expandido = aberto[p.parceiro_id] ?? (busca.trim().length > 0 || filtrados.length <= 3);
          return (
            <div key={p.parceiro_id} className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)]">
              <button
                onClick={() => setAberto((prev) => ({ ...prev, [p.parceiro_id]: !expandido }))}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[color:var(--color-surface)] transition-colors"
              >
                <FolderOpen className="w-5 h-5 text-[color:var(--color-brand)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-medium text-[color:var(--color-ink)]">{p.nome}</span>
                  <span className="ml-2 font-mono text-[10px] text-[color:var(--color-ink-faint)]">{p.codigo}</span>
                  {!p.ativo && (
                    <span className="ml-2 font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-faint)]">inativo</span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                  {p.arquivos.length} arquivo{p.arquivos.length !== 1 ? "s" : ""}
                </span>
                <ChevronDown className={`w-4 h-4 text-[color:var(--color-ink-faint)] transition-transform ${expandido ? "rotate-180" : ""}`} />
              </button>

              {expandido && (
                p.arquivos.length === 0 ? (
                  <div className="px-5 pb-4 text-[12px] text-[color:var(--color-ink-faint)]">
                    Nenhum arquivo enviado por este colaborador.
                  </div>
                ) : (
                  <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {p.arquivos.map((a) => {
                      const Icone = iconePor(a.nome);
                      return (
                        <div key={a.path} className="group flex items-start gap-2.5 border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]/60 p-3">
                          <Icone className="w-5 h-5 text-[color:var(--color-brand)] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={`/api/parceiros/arquivo?path=${encodeURIComponent(a.path)}&modo=ver`}
                              target="_blank" rel="noopener noreferrer"
                              className="block text-[12.5px] font-medium text-[color:var(--color-ink)] truncate hover:text-[color:var(--color-brand)] hover:underline underline-offset-2"
                              title={`Abrir ${a.nome}`}
                            >
                              {a.nome}
                            </a>
                            <div className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">
                              {fmtData(a.criado_em)}{a.tamanho != null ? ` · ${fmtTamanho(a.tamanho)}` : ""}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={`/api/parceiros/arquivo?path=${encodeURIComponent(a.path)}&modo=ver`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-brand)]"
                              >
                                <ExternalLink className="w-3 h-3" /> Abrir
                              </a>
                              <a
                                href={`/api/parceiros/arquivo?path=${encodeURIComponent(a.path)}`}
                                className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-brand)]"
                              >
                                <Download className="w-3 h-3" /> Baixar
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
