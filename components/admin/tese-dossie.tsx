"use client";

import { useState } from "react";
import {
  Sparkles, Loader2, FileText, Scale, Search, FolderOpen, Calculator,
  ListChecks, Link2, Building2, Clock, Landmark, FileSignature, TrendingUp,
} from "lucide-react";
import { Modal, inputCls, btnBrand, btnGhost } from "@/components/parceiros/ui";

export interface Tese {
  id: string; slug?: string; nome: string; tributos: string[]; resumo: string;
  fundamento: string | null; precedente: string | null; esfera: string;
  status_jur: string; setores: string[]; regimes: string[]; risco: string;
  retroatividade: string | null; potencial: string | null; tags: string[];
  fonte_url: string | null; observacoes: string | null; destaque: boolean; updated_at: string;
  fundamentacao_detalhada?: string | null; jurisprudencia?: string[]; como_identificar?: string | null;
  documentos?: string[]; base_calculo?: string | null; passo_a_passo?: string[];
  orgao?: string | null; prazo_prescricional?: string | null; relacionadas?: string[]; dossie_ia?: boolean;
}
interface Empresa {
  cnpj: string; razao_social: string | null; nome_fantasia: string | null;
  cnae_descricao: string | null; perfil_tributario_sugerido: string | null; municipio: string | null; uf: string | null;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const STATUS_LABEL: Record<string, string> = {
  tese_firmada: "Tese firmada", consolidada: "Consolidada",
  em_discussao: "Em discussão", modulada: "Modulada", oportunidade: "Oportunidade",
};

export function TeseDossie({
  tese, teses, empresas, onClose, onUpdated,
}: {
  tese: Tese; teses: Tese[]; empresas: Empresa[];
  onClose: () => void; onUpdated: (t: Tese) => void;
}) {
  const [t, setT] = useState<Tese>(tese);
  const [carregandoIA, setCarregandoIA] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // IA textos (parecer / potencial)
  const [ctxParecer, setCtxParecer] = useState("");
  const [parecer, setParecer] = useState<{ titulo: string; corpo: string; ressalva: string } | null>(null);
  const [ctxPot, setCtxPot] = useState("");
  const [potencial, setPotencial] = useState<{ titulo: string; corpo: string; ressalva: string } | null>(null);

  const temDossie = !!(t.fundamentacao_detalhada || (t.passo_a_passo?.length ?? 0) > 0 || (t.documentos?.length ?? 0) > 0);

  async function aprofundar() {
    setCarregandoIA("aprofundar"); setErro(null);
    try {
      const r = await fetch("/api/admin/teses/dossie", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tese_id: t.id, modo: "aprofundar" }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao aprofundar."); return; }
      const d = j.dossie || {};
      const novo = { ...t,
        fundamentacao_detalhada: d.fundamentacao_detalhada ?? t.fundamentacao_detalhada,
        jurisprudencia: d.jurisprudencia ?? t.jurisprudencia,
        como_identificar: d.como_identificar ?? t.como_identificar,
        documentos: d.documentos ?? t.documentos,
        base_calculo: d.base_calculo ?? t.base_calculo,
        passo_a_passo: d.passo_a_passo ?? t.passo_a_passo,
        prazo_prescricional: d.prazo_prescricional ?? t.prazo_prescricional,
        orgao: d.orgao ?? t.orgao, dossie_ia: true,
      };
      setT(novo); onUpdated(novo);
    } catch { setErro("Erro de conexão."); } finally { setCarregandoIA(null); }
  }

  async function gerarTexto(modo: "parecer" | "potencial", contexto: string) {
    setCarregandoIA(modo); setErro(null);
    try {
      const r = await fetch("/api/admin/teses/dossie", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tese_id: t.id, modo, contexto: contexto.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha."); return; }
      if (modo === "parecer") setParecer(j.texto); else setPotencial(j.texto);
    } catch { setErro("Erro de conexão."); } finally { setCarregandoIA(null); }
  }

  // empresas que combinam com a tese
  const empresasVinc = empresas.filter((e) => {
    const perfil = e.perfil_tributario_sugerido || "";
    if ((t.regimes || []).includes(perfil)) return true;
    const cnae = norm(e.cnae_descricao || "");
    return (t.setores || []).some((s) => { const k = norm(s); return k.length > 3 && cnae.includes(k.slice(0, 5)); });
  }).slice(0, 12);

  const relResolvidas = (t.relacionadas || []).map((slug) => {
    const achada = teses.find((x) => (x as unknown as { slug?: string }).slug === slug);
    return { slug, nome: achada?.nome || slug.replace(/-/g, " ") };
  });

  return (
    <Modal open title={t.nome} onClose={onClose} wide>
      <div className="space-y-5 text-[13px] text-[color:var(--color-ink)]">
        {/* chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(t.tributos || []).map((x) => <span key={x} className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)]">{x}</span>)}
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[color:var(--color-brand)]/30 text-[color:var(--color-brand)]">{STATUS_LABEL[t.status_jur]}</span>
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 text-[color:var(--color-ink-muted)]">risco {t.risco}</span>
          {t.orgao && <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-[color:var(--color-ink-faint)]"><Landmark className="w-3 h-3" />{t.orgao}</span>}
          {t.prazo_prescricional && <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-[color:var(--color-ink-faint)]"><Clock className="w-3 h-3" />{t.prazo_prescricional}</span>}
        </div>
        <p className="text-[14px] leading-relaxed">{t.resumo}</p>
        {t.precedente && <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">{t.precedente}</div>}

        {/* botão aprofundar */}
        {!temDossie && (
          <div className="border border-dashed border-[color:var(--color-brand)]/40 bg-blue-50/30 p-4 text-center">
            <p className="text-[12.5px] text-[color:var(--color-ink-muted)] mb-2">Esta tese ainda não tem dossiê completo.</p>
            <button onClick={() => void aprofundar()} disabled={carregandoIA === "aprofundar"} className={btnBrand + " justify-center mx-auto"}>
              {carregandoIA === "aprofundar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {carregandoIA === "aprofundar" ? "Gerando dossiê…" : "Aprofundar com IA"}
            </button>
          </div>
        )}

        {/* seções do dossiê */}
        <Secao icon={FileText} titulo="Fundamentação" texto={t.fundamentacao_detalhada} />
        <SecaoLista icon={Scale} titulo="Jurisprudência / precedentes" itens={t.jurisprudencia} />
        <Secao icon={Search} titulo="Como identificar na empresa" texto={t.como_identificar} />
        <SecaoLista icon={FolderOpen} titulo="Documentos necessários" itens={t.documentos} />
        <Secao icon={Calculator} titulo="Base de cálculo" texto={t.base_calculo} />
        <SecaoLista icon={ListChecks} titulo="Passo a passo" itens={t.passo_a_passo} ordenada />

        {temDossie && (
          <div className="flex justify-end">
            <button onClick={() => void aprofundar()} disabled={carregandoIA === "aprofundar"} className={btnGhost}>
              {carregandoIA === "aprofundar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Regerar dossiê com IA
            </button>
          </div>
        )}

        {/* teses relacionadas */}
        {relResolvidas.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1.5"><Link2 className="w-3.5 h-3.5" /> Teses relacionadas</div>
            <div className="flex flex-wrap gap-1.5">
              {relResolvidas.map((r) => <span key={r.slug} className="text-[12px] px-2 py-1 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)]">{r.nome}</span>)}
            </div>
          </div>
        )}

        {/* empresas vinculadas */}
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1.5"><Building2 className="w-3.5 h-3.5" /> Empresas pesquisadas que se encaixam</div>
          {empresasVinc.length === 0 ? (
            <p className="text-[12px] text-[color:var(--color-ink-faint)]">Nenhuma empresa compatível na base ainda — trace CNPJs na aba Empresas.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {empresasVinc.map((e) => (
                <span key={e.cnpj} className="inline-flex items-center gap-1 text-[12px] px-2 py-1 border border-[color:var(--color-brand)]/25 bg-blue-50/40">
                  {e.razao_social || e.nome_fantasia || e.cnpj}
                  {(e.municipio || e.uf) && <span className="text-[color:var(--color-ink-faint)]">· {[e.municipio, e.uf].filter(Boolean).join("/")}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* IA: parecer e potencial */}
        <div className="border-t border-[color:var(--color-hairline)] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-brand)] mb-2"><FileSignature className="w-3.5 h-3.5" /> Parecer para cliente</div>
            <input className={inputCls + " mb-2"} placeholder="Cliente/contexto (ex.: indústria têxtil, Lucro Real)" value={ctxParecer} onChange={(e) => setCtxParecer(e.target.value)} />
            <button onClick={() => void gerarTexto("parecer", ctxParecer)} disabled={carregandoIA === "parecer"} className={btnGhost}>
              {carregandoIA === "parecer" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Gerar memorando
            </button>
            {parecer && (
              <div className="mt-2 bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-3 text-[12.5px]">
                <div className="font-medium mb-1">{parecer.titulo}</div>
                <p className="whitespace-pre-wrap leading-relaxed">{parecer.corpo}</p>
                <p className="text-[11px] text-[color:var(--color-ink-faint)] italic mt-2">{parecer.ressalva}</p>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-brand)] mb-2"><TrendingUp className="w-3.5 h-3.5" /> Estimar potencial</div>
            <input className={inputCls + " mb-2"} placeholder="Faturamento/contexto (ex.: R$ 80M/ano, ICMS alto)" value={ctxPot} onChange={(e) => setCtxPot(e.target.value)} />
            <button onClick={() => void gerarTexto("potencial", ctxPot)} disabled={carregandoIA === "potencial"} className={btnGhost}>
              {carregandoIA === "potencial" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Estimar faixa
            </button>
            {potencial && (
              <div className="mt-2 bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-3 text-[12.5px]">
                <div className="font-medium mb-1">{potencial.titulo}</div>
                <p className="whitespace-pre-wrap leading-relaxed">{potencial.corpo}</p>
                <p className="text-[11px] text-[color:var(--color-ink-faint)] italic mt-2">{potencial.ressalva}</p>
              </div>
            )}
          </div>
        </div>

        {erro && <p className="text-[12px] text-rose-700">{erro}</p>}
      </div>
    </Modal>
  );
}

function Secao({ icon: Icon, titulo, texto }: { icon: React.ComponentType<{ className?: string }>; titulo: string; texto?: string | null }) {
  if (!texto) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1"><Icon className="w-3.5 h-3.5" /> {titulo}</div>
      <p className="leading-relaxed">{texto}</p>
    </div>
  );
}

function SecaoLista({ icon: Icon, titulo, itens, ordenada }: { icon: React.ComponentType<{ className?: string }>; titulo: string; itens?: string[]; ordenada?: boolean }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1"><Icon className="w-3.5 h-3.5" /> {titulo}</div>
      {ordenada ? (
        <ol className="list-decimal pl-5 space-y-0.5">{itens.map((x, i) => <li key={i}>{x}</li>)}</ol>
      ) : (
        <ul className="list-disc pl-5 space-y-0.5">{itens.map((x, i) => <li key={i}>{x}</li>)}</ul>
      )}
    </div>
  );
}
