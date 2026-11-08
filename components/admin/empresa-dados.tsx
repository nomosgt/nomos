"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { Plus, Loader2, BadgeCheck, Pencil, Check, X } from "lucide-react";

/**
 * Inteligência Empresarial — faturamento e dados econômicos da empresa.
 * Domínio SEPARADO do livro tributário: nada aqui altera caixa recuperado.
 * Dado declarado nunca nasce validado; correções exigem justificativa.
 */

interface Registro { id: string; tipo: string; periodo: string; valor: number | string; origem: string; validado: boolean; observacao: string | null; autor_nome: string | null; created_at: string }

const TIPOS: { v: string; label: string }[] = [
  { v: "faturamento_mensal", label: "Faturamento mensal" },
  { v: "faturamento_anual", label: "Faturamento anual" },
  { v: "receita_bruta", label: "Receita bruta" },
  { v: "receita_liquida", label: "Receita líquida" },
  { v: "despesas_operacionais", label: "Despesas operacionais" },
  { v: "custos", label: "Custos" },
  { v: "lucro", label: "Lucro / resultado" },
  { v: "outro", label: "Outro" },
];
const LABEL: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.v, t.label]));

export function EmpresaDados({ clienteId }: { clienteId: string }) {
  const [registros, setRegistros] = useState<Registro[] | null>(null);
  const [ultimo, setUltimo] = useState<Record<string, { periodo: string; valor: number; validado: boolean } | null>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  // novo registro
  const [tipo, setTipo] = useState("faturamento_mensal");
  const [periodo, setPeriodo] = useState("");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // correção
  const [editId, setEditId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editJust, setEditJust] = useState("");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/clientes/empresa-dados?client_id=${clienteId}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setAviso(j.error || "Indisponível."); setRegistros([]); return; }
      setRegistros(j.registros ?? []); setUltimo(j.ultimoPorTipo ?? {}); setAviso(null);
    } catch { setRegistros([]); }
  }, [clienteId]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function cadastrar() {
    setErro(null);
    if (periodo.trim().length < 2) { setErro("Informe o período (ex.: 2026-01 ou 2025)."); return; }
    setSalvando(true);
    const r = await fetch("/api/admin/clientes/empresa-dados", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clienteId, tipo, periodo: periodo.trim(), valor, observacao: obs || null }),
    });
    const j = await r.json();
    setSalvando(false);
    if (!r.ok) { setErro(j.error || "Falha ao salvar."); return; }
    setPeriodo(""); setValor(""); setObs("");
    await carregar();
  }

  async function corrigir(id: string) {
    if (editJust.trim().length < 3) { alert("Correção exige justificativa."); return; }
    const r = await fetch("/api/admin/clientes/empresa-dados", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, valor: editValor, justificativa: editJust.trim() }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || "Falha."); return; }
    setEditId(null); setEditValor(""); setEditJust("");
    await carregar();
  }

  async function validar(reg: Registro) {
    const r = await fetch("/api/admin/clientes/empresa-dados", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reg.id, validado: !reg.validado }),
    });
    if (r.ok) await carregar();
  }

  if (registros === null) return <div className="py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-[color:var(--color-ink-faint)]" /></div>;

  return (
    <div className="space-y-4">
      {aviso && <div className="text-[12px] text-amber-700 border border-amber-200 bg-amber-50 px-3 py-2">{aviso}</div>}

      {/* resumo: último período por tipo (sem somar tipos distintos) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {TIPOS.slice(0, 4).map((t) => {
          const u = ultimo[t.v];
          return (
            <div key={t.v} className="border border-[color:var(--color-hairline)] px-3 py-2.5">
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[color:var(--color-ink-faint)]">{t.label}</div>
              {u ? (
                <>
                  <div className="font-serif text-lg mt-0.5">{formatBRL(u.valor, { compact: true })}</div>
                  <div className="text-[10px] font-mono text-[color:var(--color-ink-faint)]">{u.periodo}{u.validado ? " · validado" : " · não validado"}</div>
                </>
              ) : (
                <div className="text-[12px] text-[color:var(--color-ink-faint)] mt-1">Sem dados</div>
              )}
            </div>
          );
        })}
      </div>

      {/* novo registro */}
      <div className="border border-[color:var(--color-hairline)] p-3 space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] flex items-center gap-1.5"><Plus className="w-3 h-3" /> Novo registro</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inp}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select>
          <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Período — ex.: 2026-01" className={inp} />
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[color:var(--color-ink-faint)]">R$</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${inp} pl-8 font-mono`} />
          </div>
          <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Fonte/observação (opcional)" className={inp} />
        </div>
        {erro && <p className="text-[12px] text-rose-700">{erro}</p>}
        <button onClick={() => void cadastrar()} disabled={salvando} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50">
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Registrar
        </button>
        <p className="text-[11px] text-[color:var(--color-ink-faint)]">Dados declarados não nascem validados. Este módulo é separado do livro tributário — não altera caixa recuperado.</p>
      </div>

      {/* histórico */}
      <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] max-h-72 overflow-y-auto">
        {registros.length === 0 ? (
          <div className="p-5 text-center text-[12px] text-[color:var(--color-ink-faint)]">Nenhum dado empresarial registrado ainda.</div>
        ) : registros.map((r) => (
          <div key={r.id} className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[color:var(--color-hairline)]">{LABEL[r.tipo] || r.tipo}</span>
            <span className="font-mono">{r.periodo}</span>
            {editId === r.id ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                <input value={editValor} onChange={(e) => setEditValor(e.target.value)} className="w-28 border border-[color:var(--color-hairline)] px-2 py-1 text-[12px] font-mono focus:outline-none" />
                <input value={editJust} onChange={(e) => setEditJust(e.target.value)} placeholder="Justificativa (obrigatória)" className="w-52 border border-[color:var(--color-hairline)] px-2 py-1 text-[12px] focus:outline-none" />
                <button onClick={() => void corrigir(r.id)} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditId(null)} className="p-1 text-[color:var(--color-ink-faint)]"><X className="w-3.5 h-3.5" /></button>
              </span>
            ) : (
              <span className="font-mono font-medium">{formatBRL(Number(r.valor))}</span>
            )}
            <span className="text-[10px] font-mono text-[color:var(--color-ink-faint)]">{r.origem}</span>
            <button onClick={() => void validar(r)} title={r.validado ? "Remover validação" : "Marcar como validado"} className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 border ${r.validado ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-gray-500 border-gray-200 bg-gray-50"}`}>
              <BadgeCheck className="w-3 h-3" /> {r.validado ? "Validado" : "Validar"}
            </button>
            <span className="ml-auto font-mono text-[10px] text-[color:var(--color-ink-faint)]">{r.autor_nome || "—"} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
            {editId !== r.id && (
              <button onClick={() => { setEditId(r.id); setEditValor(String(r.valor)); setEditJust(""); }} className="p-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]" title="Corrigir valor (com justificativa)"><Pencil className="w-3 h-3" /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inp = "w-full border border-[color:var(--color-hairline)] bg-transparent px-2.5 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";
