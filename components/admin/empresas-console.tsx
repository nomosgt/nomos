"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2, Search, Loader2, Sparkles, AlertTriangle, History, MapPin,
} from "lucide-react";
import { inputCls, btnBrand } from "@/components/parceiros/ui";

/**
 * Consultar empresa — traça QUALQUER empresa sob demanda a partir do CNPJ:
 * dados públicos oficiais (Receita/BrasilAPI) + cruzamento com as teses Arché
 * (IA). A base de embasamento abaixo cresce a cada consulta real.
 */

interface Empresa {
  razao_social?: string; nome_fantasia?: string; cnae_principal?: string;
  cnae_descricao?: string; porte?: string; capital_social?: number | string;
  situacao_cadastral?: string; municipio?: string; uf?: string; data_abertura?: string;
}
interface Oportunidade { nome: string; aplicabilidade: string; justificativa: string }
interface Risco { ponto: string; descricao: string }
interface Analise {
  perfil_tributario?: string; justificativa_perfil?: string;
  oportunidades?: Oportunidade[]; riscos?: Risco[]; proxima_acao?: string;
  score_aderencia?: number; complexidade?: string; prazo_estimado_meses?: number;
  cenario_setorial?: string;
}
interface Pesquisada {
  cnpj: string; razao_social: string | null; nome_fantasia: string | null;
  cnae_descricao: string | null; porte: string | null; municipio: string | null;
  uf: string | null; perfil_tributario_sugerido: string | null; created_at: string;
}

const APLIC_CLS: Record<string, string> = {
  alta: "text-emerald-700 border-emerald-200 bg-emerald-50",
  media: "text-amber-700 border-amber-200 bg-amber-50",
  baixa: "text-gray-600 border-gray-200 bg-gray-50",
};
const fmtCnpj = (c: string) => c.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");

export function EmpresasConsole() {
  const [cnpj, setCnpj] = useState("");
  const [tracando, setTracando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [fonte, setFonte] = useState<string[]>([]);

  const [pesquisadas, setPesquisadas] = useState<Pesquisada[]>([]);
  const [busca, setBusca] = useState("");

  const carregarBase = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/empresas?q=${encodeURIComponent(busca)}`, { cache: "no-store" });
      if (r.ok) { const j = await r.json(); setPesquisadas(j.empresas ?? []); }
    } catch { /* silencioso */ }
  }, [busca]);

  useEffect(() => { const t = setTimeout(() => void carregarBase(), 250); return () => clearTimeout(t); }, [carregarBase]);

  async function tracar(cnpjArg?: string) {
    const limpo = (cnpjArg ?? cnpj).replace(/\D/g, "");
    if (limpo.length !== 14) { setErro("Informe um CNPJ com 14 dígitos."); return; }
    setTracando(true); setErro(null); setEmpresa(null); setAnalise(null);
    try {
      const r = await fetch("/api/cnpj", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cnpj: limpo }) });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao consultar o CNPJ."); return; }
      setEmpresa(j.empresa || null);
      setAnalise(j.analise || null);
      setFonte(j.fonte || []);
      void carregarBase();
    } catch { setErro("Erro de conexão."); } finally { setTracando(false); }
  }

  return (
    <div className="space-y-8">
      {/* ── Traçar empresa ── */}
      <div className="border-2 border-[color:var(--color-brand)]/25 bg-blue-50/30 p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-3">
          <Building2 className="w-3.5 h-3.5" /> Traçar empresa (CNPJ)
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className={inputCls + " flex-1 min-w-[240px]"}
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void tracar(); }}
          />
          <button onClick={() => void tracar()} disabled={tracando} className={btnBrand}>
            {tracando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {tracando ? "Traçando…" : "Traçar empresa"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--color-ink-faint)]">
          Dados públicos oficiais (Receita Federal / BrasilAPI) + cruzamento com o acervo de teses da Arché.
        </p>
        {erro && <p className="mt-2 text-[12px] text-rose-700">{erro}</p>}
      </div>

      {/* ── Resultado ── */}
      {empresa && (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-5 space-y-4">
          <div>
            <h3 className="font-serif text-xl text-[color:var(--color-ink)]">{empresa.razao_social || "—"}</h3>
            {empresa.nome_fantasia && <div className="text-[13px] text-[color:var(--color-ink-muted)]">{empresa.nome_fantasia}</div>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12.5px]">
            <Info rotulo="CNAE" valor={`${empresa.cnae_principal || ""} ${empresa.cnae_descricao || ""}`.trim()} />
            <Info rotulo="Porte" valor={empresa.porte} />
            <Info rotulo="Situação" valor={empresa.situacao_cadastral} />
            <Info rotulo="Local" valor={[empresa.municipio, empresa.uf].filter(Boolean).join(" / ")} icon />
          </div>
          {fonte.length > 0 && <div className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">fonte: {fonte.join(", ")}</div>}

          {analise ? (
            <div className="border-t border-[color:var(--color-hairline)] pt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-brand)]">Cruzamento com o acervo</span>
                {typeof analise.score_aderencia === "number" && (
                  <span className="font-mono text-[11px] px-2 py-0.5 border border-[color:var(--color-hairline)]">aderência {analise.score_aderencia}/100</span>
                )}
                {analise.perfil_tributario && <span className="font-mono text-[11px] text-[color:var(--color-ink-muted)]">perfil: {analise.perfil_tributario.replace(/_/g, " ")}</span>}
                {analise.complexidade && <span className="font-mono text-[11px] text-[color:var(--color-ink-muted)]">complexidade {analise.complexidade}</span>}
              </div>
              {analise.cenario_setorial && <p className="text-[13px] text-[color:var(--color-ink)] leading-relaxed">{analise.cenario_setorial}</p>}
              {(analise.oportunidades?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">Teses aplicáveis</div>
                  {analise.oportunidades!.map((op, i) => (
                    <div key={i} className="flex items-start gap-2 text-[13px]">
                      <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 border ${APLIC_CLS[op.aplicabilidade] || APLIC_CLS.baixa}`}>{op.aplicabilidade}</span>
                      <div><span className="font-medium">{op.nome}</span><div className="text-[12px] text-[color:var(--color-ink-muted)]">{op.justificativa}</div></div>
                    </div>
                  ))}
                </div>
              )}
              {(analise.riscos?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">Pontos de atenção</div>
                  {analise.riscos!.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[12.5px] text-[color:var(--color-ink-muted)]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span><span className="font-medium text-[color:var(--color-ink)]">{r.ponto}:</span> {r.descricao}</span>
                    </div>
                  ))}
                </div>
              )}
              {analise.proxima_acao && (
                <p className="text-[12.5px] text-[color:var(--color-ink)]"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-ink-faint)] mr-1">Próxima ação:</span>{analise.proxima_acao}</p>
              )}
              <p className="text-[11px] text-[color:var(--color-ink-faint)] italic border-t border-[color:var(--color-hairline)] pt-2">
                Estimativa preliminar a partir de dados públicos — sujeita a confirmação por análise documental.
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-[color:var(--color-ink-faint)] border-t border-[color:var(--color-hairline)] pt-3">
              Dados cadastrais carregados. O cruzamento com IA não retornou agora — tente de novo em instantes.
            </p>
          )}
        </div>
      )}

      {/* ── Base de empresas pesquisadas ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[color:var(--color-brand)]" />
            <span className="font-medium text-[15px]">Empresas já pesquisadas</span>
            <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">{pesquisadas.length}</span>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
            <input className={inputCls + " pl-9"} placeholder="Buscar por nome, CNPJ, CNAE, cidade…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
        {pesquisadas.length === 0 ? (
          <p className="text-[13px] text-[color:var(--color-ink-faint)] py-6 text-center">
            Nenhuma empresa ainda. Trace um CNPJ acima — a base cresce a cada consulta.
          </p>
        ) : (
          <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)]">
            {pesquisadas.map((e) => (
              <button
                key={e.cnpj}
                onClick={() => { setCnpj(fmtCnpj(e.cnpj)); void tracar(e.cnpj); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-[color:var(--color-surface)] transition-colors"
              >
                <span className="font-medium text-[13.5px] text-[color:var(--color-ink)] flex-1 min-w-[180px]">{e.razao_social || e.nome_fantasia || e.cnpj}</span>
                <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">{fmtCnpj(e.cnpj)}</span>
                {e.cnae_descricao && <span className="text-[11.5px] text-[color:var(--color-ink-muted)] max-w-[220px] truncate">{e.cnae_descricao}</span>}
                {(e.municipio || e.uf) && <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-ink-faint)]"><MapPin className="w-3 h-3" />{[e.municipio, e.uf].filter(Boolean).join("/")}</span>}
                {e.perfil_tributario_sugerido && <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)]">{e.perfil_tributario_sugerido.replace(/_/g, " ")}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ rotulo, valor, icon }: { rotulo: string; valor?: string | null; icon?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-0.5">{rotulo}</div>
      <div className="text-[color:var(--color-ink)] flex items-center gap-1">
        {icon && valor && <MapPin className="w-3 h-3 text-[color:var(--color-ink-faint)]" />}
        {valor || "—"}
      </div>
    </div>
  );
}
