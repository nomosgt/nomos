"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, Search, FileText, Eye, Download, Pencil, Archive, RotateCcw, X, Check, Loader2, AlertCircle } from "lucide-react";

/**
 * Gerenciador de documentos do caso — upload profissional (drag-and-drop,
 * múltiplos arquivos, progresso por arquivo), busca, filtros, arquivar/restaurar,
 * renomear, visibilidade e metadados. UX enxuta, pensada para o dia a dia do admin.
 */

interface Caso { id: string; titulo: string }
interface Doc {
  id: string; nome: string; storage_path: string; categoria: string | null;
  visibilidade: "cliente" | "interno"; created_at: string; arquivado?: boolean;
  descricao?: string | null; data_referencia?: string | null; tamanho_bytes?: number | null;
}
interface FilaItem { id: string; file: File; status: "aguardando" | "enviando" | "ok" | "erro"; progresso: number; erro?: string }

const CATEGORIAS = ["geral", "contrato", "relatorio", "despacho", "peticao", "nf", "balanco", "parecer", "procuracao", "atividade"];
const MAX_BYTES = 20 * 1024 * 1024;

function fmtBytes(n?: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentosManager({ casos }: { casos: Caso[] }) {
  const [caseId, setCaseId] = useState(casos[0]?.id ?? "");
  const [categoria, setCategoria] = useState("geral");
  const [visibilidade, setVisibilidade] = useState<"cliente" | "interno">("cliente");

  const [docs, setDocs] = useState<Doc[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // filtros
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("");
  const [fVis, setFVis] = useState("");
  const [verArquivados, setVerArquivados] = useState(false);

  const carregar = useCallback(async () => {
    if (!caseId) { setDocs([]); return; }
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/clientes/documentos?case_id=${caseId}${verArquivados ? "&arquivados=1" : ""}`, { cache: "no-store" });
      const j = await r.json();
      setDocs(j.documentos ?? []);
    } catch { setDocs([]); }
    setCarregando(false);
  }, [caseId, verArquivados]);

  useEffect(() => { void carregar(); }, [carregar]);

  /* ---------- upload ---------- */
  function enfileirar(files: FileList | File[]) {
    const novos: FilaItem[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) { novos.push({ id: `${Date.now()}-${f.name}`, file: f, status: "erro", progresso: 0, erro: "acima de 20MB" }); continue; }
      novos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name}`, file: f, status: "aguardando", progresso: 0 });
    }
    setFila((q) => [...q, ...novos]);
    novos.filter((n) => n.status === "aguardando").forEach((n) => void subir(n));
  }

  function subir(item: FilaItem) {
    if (!caseId) return;
    setFila((q) => q.map((x) => (x.id === item.id ? { ...x, status: "enviando", progresso: 0, erro: undefined } : x)));
    const fd = new FormData();
    fd.append("file", item.file);
    fd.append("case_id", caseId);
    fd.append("categoria", categoria);
    fd.append("visibilidade", visibilidade);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/clientes/documentos");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = Math.round((e.loaded / e.total) * 100);
        setFila((q) => q.map((x) => (x.id === item.id ? { ...x, progresso: p } : x)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setFila((q) => q.map((x) => (x.id === item.id ? { ...x, status: "ok", progresso: 100 } : x)));
        void carregar();
      } else {
        let msg = "falha";
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* */ }
        setFila((q) => q.map((x) => (x.id === item.id ? { ...x, status: "erro", erro: msg } : x)));
      }
    };
    xhr.onerror = () => setFila((q) => q.map((x) => (x.id === item.id ? { ...x, status: "erro", erro: "rede" } : x)));
    xhr.send(fd);
  }

  const enviando = fila.some((f) => f.status === "enviando" || f.status === "aguardando");

  /* ---------- ações nos documentos ---------- */
  async function patch(id: string, campos: Record<string, unknown>) {
    const prev = docs;
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, ...campos } : x)));
    const r = await fetch("/api/admin/clientes/documentos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...campos }) });
    if (!r.ok) { setDocs(prev); const j = await r.json().catch(() => ({})); alert(j.error || "Falha ao salvar."); }
    else void carregar();
  }
  async function arquivar(d: Doc) {
    if (!confirm(`Arquivar "${d.nome}"? Sai da Sala do cliente e desta lista, mas é preservado e auditado.`)) return;
    const r = await fetch(`/api/admin/clientes/documentos?id=${d.id}`, { method: "DELETE" });
    if (r.ok) void carregar();
  }

  /* ---------- lista filtrada ---------- */
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return docs.filter((d) =>
      (!q || d.nome.toLowerCase().includes(q) || (d.descricao || "").toLowerCase().includes(q)) &&
      (!fCat || (d.categoria || "geral") === fCat) &&
      (!fVis || d.visibilidade === fVis),
    );
  }, [docs, busca, fCat, fVis]);

  return (
    <div className="space-y-5">
      {/* seletor do lote */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <L label="Caso">
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)} className={sel}>
            {casos.length === 0 && <option value="">— sem casos —</option>}
            {casos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </L>
        <L label="Categoria do upload">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={sel}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </L>
        <L label="Visibilidade do upload">
          <select value={visibilidade} onChange={(e) => setVisibilidade(e.target.value as "cliente" | "interno")} className={sel}>
            <option value="cliente">Visível ao cliente</option>
            <option value="interno">Interno (só equipe)</option>
          </select>
        </L>
      </div>

      {/* drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) enfileirar(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-[color:var(--color-brand)] bg-blue-50/40" : "border-[color:var(--color-hairline)] hover:border-[color:var(--color-ink-muted)]"}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) enfileirar(e.target.files); if (inputRef.current) inputRef.current.value = ""; }} />
        <Upload className="w-6 h-6 mx-auto text-[color:var(--color-ink-muted)] mb-2" />
        <div className="text-[13px] text-[color:var(--color-ink)]">Arraste arquivos aqui ou <span className="text-[color:var(--color-brand)] underline">selecione</span></div>
        <div className="text-[11px] text-[color:var(--color-ink-faint)] mt-1">Vários de uma vez · até 20MB cada</div>
      </div>

      {/* fila de upload */}
      {fila.length > 0 && (
        <div className="space-y-1.5">
          {fila.map((f) => (
            <div key={f.id} className="flex items-center gap-3 text-[12px] border border-[color:var(--color-hairline)] px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-[color:var(--color-ink-muted)] flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">{f.file.name}</span>
              <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">{fmtBytes(f.file.size)}</span>
              {f.status === "enviando" && (
                <div className="w-24 h-1.5 bg-[color:var(--color-hairline)] overflow-hidden"><div className="h-full bg-[color:var(--color-brand)]" style={{ width: `${f.progresso}%` }} /></div>
              )}
              {f.status === "ok" && <Check className="w-4 h-4 text-emerald-600" />}
              {f.status === "aguardando" && <Loader2 className="w-3.5 h-3.5 animate-spin text-[color:var(--color-ink-faint)]" />}
              {f.status === "erro" && (
                <span className="flex items-center gap-1.5 text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" /> {f.erro}
                  <button onClick={(e) => { e.stopPropagation(); subir(f); }} className="underline">tentar de novo</button>
                </span>
              )}
            </div>
          ))}
          {!enviando && <button onClick={() => setFila([])} className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink)]">limpar fila</button>}
        </div>
      )}

      {/* busca + filtros */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[color:var(--color-hairline)]">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou descrição…" className="w-full pl-8 pr-3 py-2 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]" />
        </div>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={selSm}><option value="">Toda categoria</option>{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={fVis} onChange={(e) => setFVis(e.target.value)} className={selSm}><option value="">Toda visibilidade</option><option value="cliente">Cliente</option><option value="interno">Interno</option></select>
        <label className="flex items-center gap-1.5 text-[12px] text-[color:var(--color-ink-muted)]">
          <input type="checkbox" checked={verArquivados} onChange={(e) => setVerArquivados(e.target.checked)} /> Arquivados
        </label>
      </div>

      {/* lista */}
      <div className="text-[11px] font-mono text-[color:var(--color-ink-faint)]">{visiveis.length} documento(s){carregando && " · carregando…"}</div>
      <div className="divide-y divide-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
        {visiveis.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[color:var(--color-ink-faint)]">Nenhum documento neste filtro.</div>
        ) : visiveis.map((d) => <DocRow key={d.id} d={d} onPatch={patch} onArquivar={arquivar} />)}
      </div>
    </div>
  );
}

function DocRow({ d, onPatch, onArquivar }: { d: Doc; onPatch: (id: string, c: Record<string, unknown>) => void; onArquivar: (d: Doc) => void }) {
  const [editNome, setEditNome] = useState(false);
  const [nome, setNome] = useState(d.nome);
  const [editDesc, setEditDesc] = useState(false);
  const [desc, setDesc] = useState(d.descricao || "");

  return (
    <div className={`p-3 flex flex-wrap items-center gap-x-3 gap-y-2 ${d.arquivado ? "bg-[color:var(--color-surface)]/50" : ""}`}>
      <FileText className="w-4 h-4 text-[color:var(--color-ink-muted)] flex-shrink-0" />
      <div className="flex-1 min-w-[200px]">
        {editNome ? (
          <div className="flex items-center gap-1">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="flex-1 border border-[color:var(--color-hairline)] px-2 py-1 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]" />
            <button onClick={() => { setEditNome(false); if (nome.trim() && nome !== d.nome) onPatch(d.id, { nome: nome.trim() }); }} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setEditNome(false); setNome(d.nome); }} className="p-1 text-[color:var(--color-ink-faint)]"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-[13.5px] truncate">{d.nome}</span>
            {d.arquivado && <span className="font-mono text-[9px] uppercase px-1 py-0.5 border border-gray-200 bg-gray-50 text-gray-500">arquivado</span>}
          </div>
        )}
        {editDesc ? (
          <div className="flex items-center gap-1 mt-1">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição…" className="flex-1 border border-[color:var(--color-hairline)] px-2 py-1 text-[12px] focus:outline-none focus:border-[color:var(--color-brand)]" />
            <button onClick={() => { setEditDesc(false); onPatch(d.id, { descricao: desc.trim() || null }); }} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => setEditDesc(true)} className="text-[11.5px] text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)] text-left">{d.descricao || "+ descrição"}</button>
        )}
      </div>

      <select value={d.categoria || "geral"} onChange={(e) => onPatch(d.id, { categoria: e.target.value })} className="border border-[color:var(--color-hairline)] text-[11px] px-1.5 py-1 focus:outline-none">
        {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button
        onClick={() => onPatch(d.id, { visibilidade: d.visibilidade === "cliente" ? "interno" : "cliente" })}
        className={`font-mono text-[9px] uppercase px-2 py-1 border ${d.visibilidade === "cliente" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-gray-600 border-gray-200 bg-gray-50"}`}
        title="Alternar visibilidade"
      >
        {d.visibilidade === "cliente" ? "Cliente" : "Interno"}
      </button>
      <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] hidden md:inline">{fmtBytes(d.tamanho_bytes)}</span>

      <div className="flex items-center gap-0.5">
        <a href={`/api/sala/documentos/baixar?path=${encodeURIComponent(d.storage_path)}&modo=ver`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]" title="Abrir"><Eye className="w-3.5 h-3.5" /></a>
        <a href={`/api/sala/documentos/baixar?path=${encodeURIComponent(d.storage_path)}&modo=baixar`} className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]" title="Baixar"><Download className="w-3.5 h-3.5" /></a>
        <button onClick={() => setEditNome(true)} className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]" title="Renomear"><Pencil className="w-3.5 h-3.5" /></button>
        {d.arquivado ? (
          <button onClick={() => onPatch(d.id, { arquivado: false })} className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-emerald-700" title="Restaurar"><RotateCcw className="w-3.5 h-3.5" /></button>
        ) : (
          <button onClick={() => onArquivar(d)} className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-rose-700" title="Arquivar"><Archive className="w-3.5 h-3.5" /></button>
        )}
      </div>
    </div>
  );
}

const sel = "w-full border border-[color:var(--color-hairline)] bg-transparent px-2.5 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";
const selSm = "border border-[color:var(--color-hairline)] bg-transparent px-2 py-2 text-[12px] focus:outline-none";
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">{label}</div>{children}</div>;
}
