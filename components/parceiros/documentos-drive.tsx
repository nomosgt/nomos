"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud, FileText, FileSpreadsheet, FileImage, FileArchive,
  File as FileIcon, Trash2, Download, ExternalLink, Loader2, Search,
} from "lucide-react";

/**
 * Meus Documentos — drive do colaborador.
 * Arrasta/solta ou clica para enviar; tudo fica no Storage da Arché,
 * visível para o colaborador e para o admin. Simples como um drive.
 */

interface Arquivo {
  path: string;
  nome: string;
  tamanho: number | null;
  criado_em: string | null;
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

export function DocumentosDrive() {
  const [arquivos, setArquivos] = useState<Arquivo[] | null>(null);
  const [enviando, setEnviando] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/parceiros/arquivos", { cache: "no-store" });
      if (!r.ok) { setArquivos([]); return; }
      const j = await r.json();
      setArquivos(j.arquivos ?? []);
    } catch {
      setArquivos([]);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function enviar(files: FileList | File[]) {
    setErro(null);
    const lista = Array.from(files);
    if (!lista.length) return;
    setEnviando((n) => n + lista.length);
    await Promise.all(
      lista.map(async (file) => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch("/api/parceiros/upload", { method: "POST", body: fd });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            setErro((j as { error?: string }).error || `Falha ao enviar ${file.name}`);
          }
        } catch {
          setErro(`Erro de conexão ao enviar ${file.name}`);
        } finally {
          setEnviando((n) => n - 1);
        }
      }),
    );
    void carregar();
  }

  async function excluir(a: Arquivo) {
    if (!confirm(`Excluir "${a.nome}"? O admin também deixará de ver este arquivo.`)) return;
    const r = await fetch(`/api/parceiros/arquivos?path=${encodeURIComponent(a.path)}`, { method: "DELETE" });
    if (r.ok) setArquivos((prev) => (prev ?? []).filter((x) => x.path !== a.path));
  }

  const filtrados = (arquivos ?? []).filter(
    (a) => !busca || a.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Zona de upload — o coração do drive */}
      <label
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); if (e.dataTransfer.files.length) void enviar(e.dataTransfer.files); }}
        className={`block cursor-pointer border-2 border-dashed px-6 py-10 text-center transition-colors ${
          arrastando
            ? "border-[color:var(--color-brand)] bg-blue-50/60"
            : "border-[color:var(--color-hairline)] bg-[color:var(--color-background)] hover:border-[color:var(--color-brand)]/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
          onChange={(e) => { if (e.target.files?.length) void enviar(e.target.files); e.target.value = ""; }}
        />
        {enviando > 0 ? (
          <div className="flex items-center justify-center gap-3 text-[color:var(--color-brand)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[14px] font-medium">Enviando {enviando} arquivo{enviando > 1 ? "s" : ""}…</span>
          </div>
        ) : (
          <>
            <UploadCloud className="w-8 h-8 mx-auto mb-3 text-[color:var(--color-brand)]" />
            <div className="text-[15px] font-medium text-[color:var(--color-ink)]">
              Arraste arquivos aqui <span className="text-[color:var(--color-ink-faint)]">ou</span>{" "}
              <span className="text-[color:var(--color-brand)] underline underline-offset-2">clique para enviar</span>
            </div>
            <div className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-faint)]">
              PDF, imagem, Word, Excel, CSV, TXT ou ZIP · até 15MB por arquivo · visível para você e para a Arché
            </div>
          </>
        )}
      </label>
      {erro && <p className="text-[12px] text-red-700">{erro}</p>}

      {/* Busca */}
      {(arquivos?.length ?? 0) > 4 && (
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
          <input
            className="w-full border border-[color:var(--color-hairline)] bg-transparent pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]"
            placeholder="Buscar arquivo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      {/* Grade de arquivos */}
      {arquivos === null ? (
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] animate-pulse py-8 text-center">
          Carregando arquivos…
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-[color:var(--color-ink-faint)]">
          {busca ? "Nenhum arquivo encontrado para essa busca." : "Nenhum arquivo ainda — envie o primeiro acima."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtrados.map((a) => {
            const Icone = iconePor(a.nome);
            return (
              <div
                key={a.path}
                className="group flex items-start gap-3 bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] p-4 hover:border-[color:var(--color-brand)]/50 transition-colors"
              >
                <Icone className="w-7 h-7 text-[color:var(--color-brand)] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <a
                    href={`/api/parceiros/arquivo?path=${encodeURIComponent(a.path)}&modo=ver`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[13.5px] font-medium text-[color:var(--color-ink)] truncate hover:text-[color:var(--color-brand)] hover:underline underline-offset-2"
                    title={`Abrir ${a.nome}`}
                  >
                    {a.nome}
                  </a>
                  <div className="font-mono text-[10.5px] text-[color:var(--color-ink-faint)] mt-0.5">
                    {fmtData(a.criado_em)}{a.tamanho != null ? ` · ${fmtTamanho(a.tamanho)}` : ""}
                  </div>
                  <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    <button
                      onClick={() => void excluir(a)}
                      className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-ink-muted)] hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
