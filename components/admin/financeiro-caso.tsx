"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/utils";
import { Plus, Loader2, RefreshCw, History } from "lucide-react";

/**
 * Financeiro do caso — livro de lançamentos rastreável. Cada valor é um
 * lançamento auditável; os estágios (potencial, apurado, compensação,
 * recuperado, honorários) são distintos e NÃO se somam entre si.
 */

interface Caso { id: string; titulo: string }
interface Lanc { id: string; tipo: string; valor: number | string; data_referencia: string | null; descricao: string | null; justificativa: string | null; autor_nome: string | null; created_at: string }

const TIPOS: { v: string; label: string; cor: string }[] = [
  { v: "potencial", label: "Potencial identificado", cor: "text-blue-700 border-blue-200 bg-blue-50" },
  { v: "apurado", label: "Crédito apurado", cor: "text-indigo-700 border-indigo-200 bg-indigo-50" },
  { v: "compensacao", label: "Em compensação", cor: "text-amber-700 border-amber-200 bg-amber-50" },
  { v: "recuperado", label: "Recuperado", cor: "text-emerald-700 border-emerald-200 bg-emerald-50" },
  { v: "honorarios", label: "Honorários", cor: "text-gray-700 border-gray-200 bg-gray-50" },
  { v: "ajuste", label: "Ajuste / auditoria", cor: "text-rose-700 border-rose-200 bg-rose-50" },
];
const LABEL: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.v, t.label]));

function parseValor(s: string): number {
  const limpo = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  return /\d/.test(limpo) ? Number(limpo) : NaN;   // sem dígito → inválido (não vira 0)
}

export function FinanceiroCaso({ casos }: { casos: Caso[] }) {
  const router = useRouter();
  const [caseId, setCaseId] = useState(casos[0]?.id ?? "");
  const [lancs, setLancs] = useState<Lanc[]>([]);
  const [totais, setTotais] = useState<Record<string, number>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [verHist, setVerHist] = useState(false);

  // form
  const [tipo, setTipo] = useState("recuperado");
  const [estagioAlvo, setEstagioAlvo] = useState("recuperado");
  const [valor, setValor] = useState("");
  const [dataRef, setDataRef] = useState("");
  const [descricao, setDescricao] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!caseId) return;
    setAviso(null);
    try {
      const r = await fetch(`/api/admin/clientes/financeiro?case_id=${caseId}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setAviso(j.error || "Indisponível."); setLancs([]); setTotais({}); return; }
      setLancs(j.lancamentos ?? []); setTotais(j.totais ?? {});
    } catch { setAviso("Falha ao carregar."); }
  }, [caseId]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function lancar() {
    setErro(null);
    const v = parseValor(valor);
    if (isNaN(v)) { setErro("Informe um valor válido."); return; }
    if (tipo === "ajuste" && justificativa.trim().length < 3) { setErro("Ajuste exige justificativa."); return; }
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/clientes/financeiro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, tipo, estagio_alvo: tipo === "ajuste" ? estagioAlvo : null, valor: v, data_referencia: dataRef || null, descricao: descricao || null, justificativa: justificativa || null }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao lançar."); setSalvando(false); return; }
      setValor(""); setDescricao(""); setJustificativa(""); setDataRef("");
      await carregar();
    } catch { setErro("Falha de rede."); }
    setSalvando(false);
  }

  async function sincronizar() {
    if (!confirm("Aplicar os totais do livro ao caso?\n\nvalor_recuperado = Σ recuperado e potencial = Σ potencial. A ação é registrada na auditoria.")) return;
    const r = await fetch("/api/admin/clientes/financeiro", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: caseId, acao: "sincronizar" }) });
    if (r.ok) { await carregar(); router.refresh(); }
    else { const j = await r.json().catch(() => ({})); alert(j.error || "Falha ao sincronizar."); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="border border-[color:var(--color-hairline)] bg-transparent px-2.5 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]">
          {casos.length === 0 && <option value="">— sem casos —</option>}
          {casos.map((c) => <option key={c.id} value={c.id}>Caso: {c.titulo}</option>)}
        </select>
        <button onClick={() => void sincronizar()} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[color:var(--color-hairline)] text-[11px] font-mono uppercase tracking-wider hover:border-[color:var(--color-brand)]">
          <RefreshCw className="w-3 h-3" /> Sincronizar com o caso
        </button>
      </div>

      {aviso && <div className="text-[12px] text-amber-700 border border-amber-200 bg-amber-50 px-3 py-2">{aviso}</div>}

      {/* totais por estágio — separados, sem somar entre si */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {TIPOS.filter((t) => t.v !== "ajuste").map((t) => (
          <div key={t.v} className={`border px-3 py-2.5 ${t.cor}`}>
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-80">{t.label}</div>
            <div className="font-serif text-lg mt-0.5">{formatBRL(totais[t.v] || 0, { compact: true })}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[color:var(--color-ink-faint)]">Os estágios são distintos e não se somam entre si — representam momentos do mesmo crédito.</p>

      {/* novo lançamento */}
      <div className="border border-[color:var(--color-hairline)] p-4 space-y-2.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] flex items-center gap-1.5"><Plus className="w-3 h-3" /> Novo lançamento</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inp}>
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[color:var(--color-ink-faint)]">R$</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${inp} pl-8 font-mono`} />
          </div>
          <input type="date" value={dataRef} onChange={(e) => setDataRef(e.target.value)} className={inp} />
        </div>
        {tipo === "ajuste" && (
          <label className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink-muted)]">
            Corrige o estágio:
            <select value={estagioAlvo} onChange={(e) => setEstagioAlvo(e.target.value)} className={inp}>
              {TIPOS.filter((t) => t.v !== "ajuste").map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </label>
        )}
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional) — ex.: PER/DCOMP competência 11/2026" className={inp} />
        <input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder={tipo === "ajuste" ? "Justificativa (obrigatória para ajuste)" : "Justificativa (opcional)"} className={inp} />
        {erro && <p className="text-[12px] text-rose-700">{erro}</p>}
        <button onClick={() => void lancar()} disabled={salvando || !caseId} className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50">
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Registrar lançamento
        </button>
      </div>

      {/* histórico */}
      <div>
        <button onClick={() => setVerHist((v) => !v)} className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline">
          <History className="w-3 h-3" /> {verHist ? "Ocultar" : "Ver"} histórico ({lancs.length})
        </button>
        {verHist && (
          <div className="mt-2 border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] max-h-72 overflow-y-auto">
            {lancs.length === 0 ? (
              <div className="p-4 text-center text-[12px] text-[color:var(--color-ink-faint)]">Nenhum lançamento ainda.</div>
            ) : lancs.map((l) => (
              <div key={l.id} className="p-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[color:var(--color-hairline)]">{LABEL[l.tipo] || l.tipo}</span>
                <span className="font-mono font-medium">{formatBRL(Number(l.valor))}</span>
                {l.descricao && <span className="text-[color:var(--color-ink-muted)]">· {l.descricao}</span>}
                {l.justificativa && <span className="text-[11px] text-[color:var(--color-ink-faint)] italic">({l.justificativa})</span>}
                <span className="ml-auto font-mono text-[10px] text-[color:var(--color-ink-faint)]">{l.autor_nome || "admin"} · {new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inp = "w-full border border-[color:var(--color-hairline)] bg-transparent px-2.5 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";
