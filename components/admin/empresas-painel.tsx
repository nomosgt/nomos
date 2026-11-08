"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/utils";
import { Building2, Search, Loader2, AlertTriangle, BadgeCheck } from "lucide-react";

/** Painel de Inteligência Empresarial — todas as empresas, dados reais, "Sem dados" quando faltar. */

interface Empresa {
  user_id: string; empresa: string; nome_fantasia: string | null; setor: string | null;
  regime: string | null; consultor: string | null; status: string;
  casos_ativos: number; prazos: { atrasadas: number; proximos7d: number };
  analises: { pendentes: number; aprovadas: number };
  faturamento: { tipo: string; periodo: string; valor: number; origem: string; validado: boolean } | null;
  dados_aguardando_validacao: number; atualizado_em: string;
}

export function EmpresasPainel() {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [busca, setBusca] = useState("");
  const [fSetor, setFSetor] = useState("");
  const [soAtencao, setSoAtencao] = useState(false);
  const [ordem, setOrdem] = useState<"nome" | "atrasadas" | "analises">("nome");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/clientes/visao", { cache: "no-store" });
      const j = await r.json();
      setEmpresas(j.empresas ?? []);
    } catch { setEmpresas([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const setores = useMemo(() => [...new Set((empresas ?? []).map((e) => e.setor).filter(Boolean))] as string[], [empresas]);

  const visiveis = useMemo(() => {
    if (!empresas) return [];
    const q = busca.trim().toLowerCase();
    let lista = empresas.filter((e) =>
      (!q || e.empresa.toLowerCase().includes(q) || (e.nome_fantasia || "").toLowerCase().includes(q) || (e.consultor || "").toLowerCase().includes(q)) &&
      (!fSetor || e.setor === fSetor) &&
      (!soAtencao || e.prazos.atrasadas > 0 || e.analises.pendentes > 0 || e.dados_aguardando_validacao > 0),
    );
    lista = [...lista].sort((a, b) => {
      if (ordem === "atrasadas") return b.prazos.atrasadas - a.prazos.atrasadas;
      if (ordem === "analises") return b.analises.pendentes - a.analises.pendentes;
      return a.empresa.localeCompare(b.empresa);
    });
    return lista;
  }, [empresas, busca, fSetor, soAtencao, ordem]);

  if (empresas === null) return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[color:var(--color-ink-faint)]" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa ou consultor…" className="w-full pl-8 pr-3 py-2 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]" />
        </div>
        {setores.length > 0 && (
          <select value={fSetor} onChange={(e) => setFSetor(e.target.value)} className="border border-[color:var(--color-hairline)] bg-transparent px-2 py-2 text-[12px] focus:outline-none">
            <option value="">Todos os setores</option>
            {setores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-[12px] text-[color:var(--color-ink-muted)]">
          <input type="checkbox" checked={soAtencao} onChange={(e) => setSoAtencao(e.target.checked)} /> Exige atenção
        </label>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} className="border border-[color:var(--color-hairline)] bg-transparent px-2 py-2 text-[12px] focus:outline-none">
          <option value="nome">Ordenar: nome</option>
          <option value="atrasadas">Ordenar: atrasos</option>
          <option value="analises">Ordenar: análises pendentes</option>
        </select>
      </div>

      <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
        {visiveis.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-[color:var(--color-ink-faint)]">
            <Building2 className="w-5 h-5 mx-auto mb-2 opacity-50" /> Nenhuma empresa neste filtro.
          </div>
        ) : visiveis.map((e) => (
          <Link key={e.user_id} href={`/admin/clientes/${e.user_id}`} className="block p-4 hover:bg-[color:var(--color-surface)]/60 transition-colors">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium text-[14px]">{e.empresa}</div>
                <div className="text-[11.5px] text-[color:var(--color-ink-muted)] flex flex-wrap gap-x-2">
                  {e.setor && <span>{e.setor}</span>}
                  {e.regime && <span>· {e.regime}</span>}
                  {e.consultor && <span>· consultor: {e.consultor}</span>}
                </div>
              </div>
              <div className="min-w-[170px]">
                <div className="font-mono text-[9px] uppercase text-[color:var(--color-ink-faint)]">Faturamento ({e.faturamento ? e.faturamento.periodo : "—"})</div>
                {e.faturamento ? (
                  <div className="text-[13px] font-mono flex items-center gap-1.5">
                    {formatBRL(e.faturamento.valor, { compact: true })}
                    <span className="text-[9px] text-[color:var(--color-ink-faint)]">{e.faturamento.origem}</span>
                    {e.faturamento.validado && <BadgeCheck className="w-3 h-3 text-emerald-600" />}
                  </div>
                ) : (
                  <div className="text-[12px] text-[color:var(--color-ink-faint)]">Sem dados</div>
                )}
              </div>
              <Mini label="Casos ativos" v={e.casos_ativos} />
              <Mini label="Análises pend." v={e.analises.pendentes} destaque={e.analises.pendentes > 0 ? "amber" : undefined} />
              <Mini label="Prazos 7d" v={e.prazos.proximos7d} />
              <Mini label="Atrasadas" v={e.prazos.atrasadas} destaque={e.prazos.atrasadas > 0 ? "rose" : undefined} />
              {e.dados_aguardando_validacao > 0 && (
                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 border border-amber-200 bg-amber-50 text-amber-700">
                  <AlertTriangle className="w-3 h-3" /> {e.dados_aguardando_validacao} dado(s) a validar
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, v, destaque }: { label: string; v: number; destaque?: "rose" | "amber" }) {
  const cor = destaque === "rose" ? "text-rose-700" : destaque === "amber" ? "text-amber-700" : "";
  return (
    <div className="text-center min-w-[70px]">
      <div className="font-mono text-[9px] uppercase text-[color:var(--color-ink-faint)]">{label}</div>
      <div className={`font-mono text-[15px] ${cor}`}>{v}</div>
    </div>
  );
}
