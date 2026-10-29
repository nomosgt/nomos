"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Sparkles, Plus, Pencil, Trash2, Loader2, Star,
  BookOpen, ExternalLink, FlaskConical,
} from "lucide-react";
import {
  Modal, Field, inputCls, selectCls, btnBrand, btnGhost, btnDanger, EmptyState,
} from "@/components/parceiros/ui";

/**
 * Central de Inteligência de Teses — protótipo à parte (não linkado no menu).
 * Acervo próprio + pesquisa IA cruzando com o acervo. Fontes legítimas.
 */

interface Tese {
  id: string;
  nome: string;
  tributos: string[];
  resumo: string;
  fundamento: string | null;
  precedente: string | null;
  esfera: string;
  status_jur: string;
  setores: string[];
  regimes: string[];
  risco: string;
  retroatividade: string | null;
  potencial: string | null;
  tags: string[];
  fonte_url: string | null;
  observacoes: string | null;
  destaque: boolean;
  updated_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  tese_firmada: "Tese firmada", consolidada: "Consolidada",
  em_discussao: "Em discussão", modulada: "Modulada", oportunidade: "Oportunidade",
};
const STATUS_CLS: Record<string, string> = {
  tese_firmada: "text-emerald-700 bg-emerald-50 border-emerald-200",
  consolidada: "text-emerald-700 bg-emerald-50 border-emerald-200",
  em_discussao: "text-amber-700 bg-amber-50 border-amber-200",
  modulada: "text-blue-700 bg-blue-50 border-blue-200",
  oportunidade: "text-violet-700 bg-violet-50 border-violet-200",
};
const RISCO_CLS: Record<string, string> = {
  baixo: "text-emerald-700", medio: "text-amber-700", alto: "text-rose-700",
};

interface PesquisaResultado {
  resposta: string;
  teses_aplicaveis: { nome: string; aderencia: string; porque: string; no_acervo: boolean }[];
  proximos_passos: string[];
  confianca: string;
  ressalva: string;
}

const vazia: Partial<Tese> = { esfera: "ambas", status_jur: "oportunidade", risco: "medio" };

export default function TesesPage() {
  const [teses, setTeses] = useState<Tese[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fTributo, setFTributo] = useState("");
  const [fRisco, setFRisco] = useState("");
  const [fStatus, setFStatus] = useState("");

  const [modal, setModal] = useState<null | Tese>(null);
  const [novo, setNovo] = useState(false);

  // pesquisa IA
  const [pergunta, setPergunta] = useState("");
  const [setorIA, setSetorIA] = useState("");
  const [pesquisando, setPesquisando] = useState(false);
  const [resultado, setResultado] = useState<PesquisaResultado | null>(null);
  const [erroIA, setErroIA] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (fTributo) sp.set("tributo", fTributo);
      if (fRisco) sp.set("risco", fRisco);
      if (fStatus) sp.set("status", fStatus);
      const r = await fetch(`/api/admin/teses?${sp}`, { cache: "no-store" });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErro((j as { error?: string }).error || "Falha ao carregar."); return; }
      const j = await r.json();
      setErro(null);
      setTeses(j.teses ?? []);
    } catch { setErro("Erro de conexão."); }
  }, [q, fTributo, fRisco, fStatus]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 250); // debounce da busca/filtros
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => {
    const t = setInterval(() => void carregar(), 25000); // reflete edições do outro admin
    return () => clearInterval(t);
  }, [carregar]);

  const tributosDisponiveis = useMemo(() => {
    const s = new Set<string>();
    (teses ?? []).forEach((t) => (t.tributos || []).forEach((x) => s.add(x)));
    return [...s].sort();
  }, [teses]);

  async function pesquisarIA() {
    if (pergunta.trim().length < 3) return;
    setPesquisando(true); setErroIA(null); setResultado(null);
    try {
      const r = await fetch("/api/admin/teses/pesquisar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: pergunta.trim(), setor: setorIA.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) { setErroIA(j.error || "Falha na pesquisa."); return; }
      setResultado(j.resultado);
    } catch { setErroIA("Erro de conexão."); } finally { setPesquisando(false); }
  }

  async function excluir(t: Tese) {
    if (!confirm(`Excluir a tese "${t.nome}"?`)) return;
    const r = await fetch(`/api/admin/teses?id=${t.id}`, { method: "DELETE" });
    if (r.ok) setTeses((prev) => (prev ?? []).filter((x) => x.id !== t.id));
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight">Central de Inteligência de Teses</h1>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 border border-[color:var(--color-accent)] text-[color:var(--color-accent-dim)] flex items-center gap-1">
            <FlaskConical className="w-3 h-3" /> protótipo
          </span>
        </div>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Acervo próprio da Arché + pesquisa com IA. Em teste — fora do menu até você e o Éverton aprovarem.
        </p>
      </div>

      {/* ───────── Pesquisa IA ───────── */}
      <div className="border-2 border-[color:var(--color-brand)]/25 bg-blue-50/30 p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Pesquisar com IA
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3">
          <textarea
            className={inputCls}
            rows={2}
            placeholder="Ex.: Quais teses se aplicam a uma indústria de alimentos no Lucro Real?"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <input className={inputCls} placeholder="Setor/atividade (opcional)" value={setorIA} onChange={(e) => setSetorIA(e.target.value)} />
            <button onClick={() => void pesquisarIA()} disabled={pesquisando || pergunta.trim().length < 3} className={btnBrand + " justify-center"}>
              {pesquisando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {pesquisando ? "Pesquisando…" : "Pesquisar"}
            </button>
          </div>
        </div>
        {erroIA && <p className="mt-2 text-[12px] text-rose-700">{erroIA}</p>}
        {resultado && (
          <div className="mt-4 bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] p-4 space-y-3">
            <p className="text-[14px] text-[color:var(--color-ink)] leading-relaxed">{resultado.resposta}</p>
            {resultado.teses_aplicaveis.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">Teses aplicáveis</div>
                {resultado.teses_aplicaveis.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px]">
                    <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 border ${t.aderencia === "alta" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : t.aderencia === "media" ? "text-amber-700 border-amber-200 bg-amber-50" : "text-gray-600 border-gray-200 bg-gray-50"}`}>{t.aderencia}</span>
                    <div>
                      <span className="font-medium">{t.nome}</span>
                      {t.no_acervo && <span className="ml-1.5 font-mono text-[9px] uppercase text-[color:var(--color-brand)]">● no acervo</span>}
                      <div className="text-[12px] text-[color:var(--color-ink-muted)]">{t.porque}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {resultado.proximos_passos.length > 0 && (
              <div className="text-[13px]">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">Próximos passos</div>
                <ul className="list-disc pl-5 space-y-0.5 text-[color:var(--color-ink)]">
                  {resultado.proximos_passos.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-ink-faint)]">Confiança: <span className={RISCO_CLS[resultado.confianca === "alta" ? "baixo" : resultado.confianca === "media" ? "medio" : "alto"]}>{resultado.confianca}</span></span>
            </div>
            <p className="text-[11px] text-[color:var(--color-ink-faint)] italic border-t border-[color:var(--color-hairline)] pt-2">{resultado.ressalva}</p>
          </div>
        )}
      </div>

      {/* ───────── Acervo ───────── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[color:var(--color-brand)]" />
            <span className="font-medium text-[15px]">Acervo de teses</span>
            <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">{teses?.length ?? 0}</span>
          </div>
          <button onClick={() => setNovo(true)} className={btnBrand}><Plus className="w-3.5 h-3.5" /> Nova tese</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 mb-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
            <input className={inputCls + " pl-9"} placeholder="Buscar por nome, tributo, precedente, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={selectCls} value={fTributo} onChange={(e) => setFTributo(e.target.value)}>
            <option value="">Todos os tributos</option>
            {tributosDisponiveis.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={selectCls} value={fRisco} onChange={(e) => setFRisco(e.target.value)}>
            <option value="">Todo risco</option>
            <option value="baixo">Risco baixo</option>
            <option value="medio">Risco médio</option>
            <option value="alto">Risco alto</option>
          </select>
          <select className={selectCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todo status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {erro && <p className="text-[13px] text-rose-700 mb-3">{erro}</p>}

        {teses === null ? (
          <div className="flex items-center gap-2 text-[color:var(--color-ink-faint)] py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Carregando acervo…</span>
          </div>
        ) : teses.length === 0 ? (
          <EmptyState title="Nenhuma tese" body={erro ? "Rode o SQL do teses-v9 no Supabase para criar e semear o acervo." : "Nenhuma tese para esse filtro."} action={<button onClick={() => setNovo(true)} className={btnBrand}><Plus className="w-3.5 h-3.5" /> Nova tese</button>} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {teses.map((t) => (
              <div key={t.id} className="group border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-4 hover:border-[color:var(--color-brand)]/40 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {t.destaque && <Star className="w-3.5 h-3.5 text-[color:var(--color-accent)] flex-shrink-0 fill-[color:var(--color-accent)]" />}
                    <h3 className="font-medium text-[14px] text-[color:var(--color-ink)]">{t.nome}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setModal(t)} className="p-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => void excluir(t)} className="p-1 text-[color:var(--color-ink-faint)] hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-[12.5px] text-[color:var(--color-ink-muted)] leading-relaxed mb-2.5">{t.resumo}</p>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {(t.tributos || []).map((tr) => <span key={tr} className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)]">{tr}</span>)}
                  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${STATUS_CLS[t.status_jur]}`}>{STATUS_LABEL[t.status_jur]}</span>
                  <span className={`font-mono text-[9px] uppercase ${RISCO_CLS[t.risco]}`}>risco {t.risco}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--color-ink-faint)] font-mono">
                  {t.precedente && <span>{t.precedente}</span>}
                  {t.retroatividade && <span>· {t.retroatividade}</span>}
                </div>
                {t.fonte_url && (
                  <a href={t.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] text-[color:var(--color-brand)] hover:underline underline-offset-2">
                    <ExternalLink className="w-3 h-3" /> fonte
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={novo || !!modal} title={modal ? "Editar tese" : "Nova tese"} onClose={() => { setModal(null); setNovo(false); }} wide>
        <TeseForm existing={modal} onSaved={() => { setModal(null); setNovo(false); void carregar(); }} />
      </Modal>
    </div>
  );
}

function TeseForm({ existing, onSaved }: { existing: Tese | null; onSaved: () => void }) {
  const [f, setF] = useState<Partial<Tese>>(existing || vazia);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const arr = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
  const join = (a?: string[]) => (a || []).join(", ");

  async function salvar() {
    if ((f.nome || "").trim().length < 3 || (f.resumo || "").trim().length < 3) {
      setErro("Nome e resumo são obrigatórios."); return;
    }
    setSalvando(true); setErro(null);
    try {
      const payload = {
        nome: f.nome, resumo: f.resumo, fundamento: f.fundamento || null, precedente: f.precedente || null,
        esfera: f.esfera || "ambas", status_jur: f.status_jur || "oportunidade", risco: f.risco || "medio",
        retroatividade: f.retroatividade || null, potencial: f.potencial || null, observacoes: f.observacoes || null,
        fonte_url: f.fonte_url || null, destaque: !!f.destaque,
        tributos: f.tributos, setores: f.setores, regimes: f.regimes, tags: f.tags,
      };
      const r = existing
        ? await fetch("/api/admin/teses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: existing.id, ...payload }) })
        : await fetch("/api/admin/teses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao salvar."); return; }
      onSaved();
    } catch { setErro("Erro de conexão."); } finally { setSalvando(false); }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome da tese *" span2>
        <input className={inputCls} value={f.nome || ""} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </Field>
      <Field label="Resumo *" span2>
        <textarea className={inputCls} rows={2} value={f.resumo || ""} onChange={(e) => setF({ ...f, resumo: e.target.value })} />
      </Field>
      <Field label="Tributos (vírgula)"><input className={inputCls} value={join(f.tributos)} onChange={(e) => setF({ ...f, tributos: arr(e.target.value) })} placeholder="PIS, COFINS" /></Field>
      <Field label="Precedente"><input className={inputCls} value={f.precedente || ""} onChange={(e) => setF({ ...f, precedente: e.target.value })} placeholder="Tema 69 STF · RE 574.706" /></Field>
      <Field label="Fundamento legal" span2><textarea className={inputCls} rows={2} value={f.fundamento || ""} onChange={(e) => setF({ ...f, fundamento: e.target.value })} /></Field>
      <Field label="Esfera">
        <select className={selectCls} value={f.esfera || "ambas"} onChange={(e) => setF({ ...f, esfera: e.target.value })}>
          <option value="ambas">Ambas</option><option value="judicial">Judicial</option><option value="administrativa">Administrativa</option>
        </select>
      </Field>
      <Field label="Status jurisprudencial">
        <select className={selectCls} value={f.status_jur || "oportunidade"} onChange={(e) => setF({ ...f, status_jur: e.target.value })}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Risco">
        <select className={selectCls} value={f.risco || "medio"} onChange={(e) => setF({ ...f, risco: e.target.value })}>
          <option value="baixo">Baixo</option><option value="medio">Médio</option><option value="alto">Alto</option>
        </select>
      </Field>
      <Field label="Retroatividade"><input className={inputCls} value={f.retroatividade || ""} onChange={(e) => setF({ ...f, retroatividade: e.target.value })} placeholder="5 anos" /></Field>
      <Field label="Setores (vírgula)"><input className={inputCls} value={join(f.setores)} onChange={(e) => setF({ ...f, setores: arr(e.target.value) })} placeholder="Indústria, Varejo" /></Field>
      <Field label="Regimes (vírgula)"><input className={inputCls} value={join(f.regimes)} onChange={(e) => setF({ ...f, regimes: arr(e.target.value) })} placeholder="lucro_real" /></Field>
      <Field label="Potencial" span2><textarea className={inputCls} rows={2} value={f.potencial || ""} onChange={(e) => setF({ ...f, potencial: e.target.value })} /></Field>
      <Field label="Tags (vírgula)"><input className={inputCls} value={join(f.tags)} onChange={(e) => setF({ ...f, tags: arr(e.target.value) })} /></Field>
      <Field label="Fonte (URL)"><input className={inputCls} value={f.fonte_url || ""} onChange={(e) => setF({ ...f, fonte_url: e.target.value })} /></Field>
      <Field label="Observações" span2><textarea className={inputCls} rows={2} value={f.observacoes || ""} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></Field>
      <label className="md:col-span-2 flex items-center gap-2 text-[13px] text-[color:var(--color-ink)] cursor-pointer">
        <input type="checkbox" className="w-4 h-4 accent-[color:var(--color-brand)]" checked={!!f.destaque} onChange={(e) => setF({ ...f, destaque: e.target.checked })} />
        Destacar no topo do acervo
      </label>
      {erro && <p className="md:col-span-2 text-[12px] text-rose-700">{erro}</p>}
      <div className="md:col-span-2 flex justify-end pt-1">
        <button onClick={() => void salvar()} disabled={salvando} className={btnBrand}>
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Salvar tese
        </button>
      </div>
    </div>
  );
}
