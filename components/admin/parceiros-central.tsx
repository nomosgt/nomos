"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, ChevronDown, CheckCircle2, XCircle, AlertTriangle,
  Send, RefreshCw, Handshake,
} from "lucide-react";

/**
 * Admin · Central do Parceiro v2 — visão e controle total do admin
 * sobre os dados sincronizados de cada colaborador + ponte pro cliente.
 */

interface Trabalho {
  id: string; titulo: string; status: string; ressalva?: string;
  descricao?: string; criado_em?: string;
}
interface Comissao {
  id: string; descricao: string; valor: number; percentual?: number;
  status: string; data_pagamento?: string | null;
}
interface Snapshot {
  clientes?: { id: string; nome: string; documento?: string }[];
  projetos?: {
    id: string; nome: string; status: string; vencimento?: string | null;
    andamentos?: { id: string; texto: string; criado_em: string }[];
  }[];
  trabalhos?: Trabalho[];
  comissoes?: Comissao[];
  relatorios?: { id: string; periodo: string; resumo?: string }[];
  diario?: { id: string; texto: string; projeto_id: string | null; criado_em: string }[];
  documentos?: { id: string; nome: string; tipo: string; storage_path?: string | null; arquivo_nome?: string | null }[];
  [k: string]: unknown;
}
interface Financeiro {
  percentual: number; pendente: number;
  proximo_pagamento: string | null; proximo_valor: number | null;
  observacoes: string | null;
}
interface Parceiro {
  id: string; codigo: string; nome: string; percentual: number | null;
  ativo: boolean; papel?: "parceiro" | "supervisor"; ultimo_acesso: string | null;
  snapshot: Snapshot | null;
  snapshot_updated_at: string | null;
  snapshot_updated_by: string | null;
  financeiro: Financeiro | null;
}
interface CaseRow {
  id: string; titulo: string; tese: string | null; status: string;
  client_profiles: { nome: string; empresa: string | null } | null;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const finInputCls =
  "w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";

/** Papel (parceiro/supervisão) + Folha oficial que o colaborador vê na Central. */
function PapelEFolha({
  p, salvando, onTogglePapel, onSalvarFin,
}: {
  p: Parceiro;
  salvando: boolean;
  onTogglePapel: () => void;
  onSalvarFin: (f: Financeiro) => void;
}) {
  const [f, setF] = useState<Financeiro>({
    percentual: p.financeiro?.percentual ?? p.percentual ?? 0,
    pendente: p.financeiro?.pendente ?? 0,
    proximo_pagamento: p.financeiro?.proximo_pagamento ?? null,
    proximo_valor: p.financeiro?.proximo_valor ?? null,
    observacoes: p.financeiro?.observacoes ?? null,
  });
  const [salvo, setSalvo] = useState(false);

  return (
    <div className="border border-[color:var(--color-brand)]/25 bg-blue-50/30 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)]">
          Folha do colaborador — o que ele vê na Central
        </div>
        <button
          onClick={onTogglePapel}
          disabled={salvando}
          className="text-[11px] font-mono uppercase tracking-[0.15em] px-3 py-1.5 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-dim)] disabled:opacity-50"
        >
          {p.papel === "supervisor" ? "Reverter p/ parceiro" : "Tornar supervisor(a)"}
        </button>
      </div>

      {p.papel === "supervisor" ? (
        <p className="text-[12px] text-[color:var(--color-ink-muted)]">
          Perfil de supervisão: acessa os processos de todos os colaboradores,
          sem qualquer dado financeiro. A folha não se aplica.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">
                Comissão %
              </label>
              <input
                type="number" min={0} max={100} step={0.5}
                className={finInputCls}
                value={f.percentual}
                onChange={(e) => setF({ ...f, percentual: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">
                Pendente (R$)
              </label>
              <input
                type="number" min={0} step={0.01}
                className={finInputCls}
                value={f.pendente}
                onChange={(e) => setF({ ...f, pendente: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">
                Próx. pagamento
              </label>
              <input
                type="date"
                className={finInputCls}
                value={f.proximo_pagamento ?? ""}
                onChange={(e) => setF({ ...f, proximo_pagamento: e.target.value || null })}
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">
                Valor próx. (R$)
              </label>
              <input
                type="number" min={0} step={0.01}
                className={finInputCls}
                value={f.proximo_valor ?? ""}
                onChange={(e) =>
                  setF({ ...f, proximo_valor: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={finInputCls + " flex-1 min-w-[220px]"}
              placeholder="Observação visível ao colaborador (opcional)"
              value={f.observacoes ?? ""}
              onChange={(e) => setF({ ...f, observacoes: e.target.value || null })}
            />
            <button
              onClick={() => { onSalvarFin(f); setSalvo(true); setTimeout(() => setSalvo(false), 2500); }}
              disabled={salvando}
              className="px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
            >
              {salvo ? "Salvo ✓" : "Salvar folha"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ParceirosCentral() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pub, setPub] = useState<{ caseId: string; titulo: string; corpo: string }>({
    caseId: "", titulo: "", corpo: "",
  });
  const [pubMsg, setPubMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/parceiros", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "erro");
      setParceiros(j.parceiros ?? []);
      setCases(j.cases ?? []);
    } catch {
      setErro("Não foi possível carregar. Rodou o SQL do parceiros-v2 no Supabase?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gravar(p: Parceiro, novoSnapshot: Snapshot) {
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/parceiros", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parceiro_id: p.id, dados: novoSnapshot }),
      });
      if (r.ok) {
        setParceiros((prev) =>
          prev.map((x) =>
            x.id === p.id
              ? { ...x, snapshot: novoSnapshot, snapshot_updated_by: "admin", snapshot_updated_at: new Date().toISOString() }
              : x,
          ),
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  function mudarTrabalho(p: Parceiro, tid: string, status: string, ressalva?: string) {
    if (!p.snapshot) return;
    const snap = structuredClone(p.snapshot);
    snap.trabalhos = (snap.trabalhos ?? []).map((t) =>
      t.id === tid ? { ...t, status, ressalva: ressalva ?? t.ressalva } : t,
    );
    void gravar(p, snap);
  }

  function mudarComissao(p: Parceiro, cid: string, status: string) {
    if (!p.snapshot) return;
    const snap = structuredClone(p.snapshot);
    snap.comissoes = (snap.comissoes ?? []).map((c) =>
      c.id === cid
        ? { ...c, status, data_pagamento: status === "paga" ? new Date().toISOString().slice(0, 10) : c.data_pagamento }
        : c,
    );
    void gravar(p, snap);
  }

  async function salvarFinanceiro(p: Parceiro, fin: Financeiro) {
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/parceiros", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parceiro_id: p.id,
          financeiro: {
            percentual: fin.percentual,
            pendente: fin.pendente,
            proximo_pagamento: fin.proximo_pagamento || null,
            proximo_valor: fin.proximo_valor ?? null,
            observacoes: fin.observacoes || null,
          },
        }),
      });
      if (r.ok) {
        setParceiros((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, financeiro: fin } : x)),
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  async function togglePapel(p: Parceiro) {
    const novo = p.papel === "supervisor" ? "parceiro" : "supervisor";
    if (
      novo === "supervisor" &&
      !window.confirm(
        `Tornar ${p.nome} SUPERVISOR(A)? Este perfil vê os processos de TODOS os colaboradores, mas NUNCA dados financeiros.`,
      )
    )
      return;
    setSalvando(true);
    try {
      const r = await fetch("/api/admin/colaboradores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, papel: novo }),
      });
      if (r.ok) {
        setParceiros((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, papel: novo } : x)),
        );
      }
    } finally {
      setSalvando(false);
    }
  }

  async function publicar() {
    if (!pub.caseId || pub.titulo.length < 3 || pub.corpo.length < 3) return;
    setSalvando(true);
    setPubMsg(null);
    try {
      const r = await fetch("/api/admin/parceiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: pub.caseId, titulo: pub.titulo, corpo: pub.corpo }),
      });
      setPubMsg(r.ok ? "Publicado na Sala do Cliente ✓" : "Falha ao publicar.");
      if (r.ok) setPub({ caseId: "", titulo: "", corpo: "" });
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8 text-[13px] text-[color:var(--color-ink-muted)]">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando parceiros…
      </div>
    );
  }
  if (erro) {
    return (
      <div className="flex items-start gap-2 p-4 border border-amber-200 bg-amber-50 text-[13px] text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5" /> {erro}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Parceiros */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
            Colaboradores · dados sincronizados
          </h2>
          <button
            onClick={() => void carregar()}
            className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>

        {parceiros.length === 0 && (
          <p className="text-[13px] text-[color:var(--color-ink-faint)] p-6 border border-[color:var(--color-hairline)]">
            Nenhum colaborador ainda. Gere códigos na aba Colaboradores.
          </p>
        )}

        {parceiros.map((p) => {
          const s = p.snapshot;
          const pendentes = (s?.trabalhos ?? []).filter((t) => t.status === "pendente");
          const aReceber = (s?.comissoes ?? [])
            .filter((c) => c.status !== "paga")
            .reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
          const open = aberto === p.id;
          return (
            <div key={p.id} className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
              <button
                onClick={() => setAberto(open ? null : p.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[color:var(--color-surface)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Handshake className="w-4 h-4 text-[color:var(--color-brand)]" />
                  <div>
                    <div className="font-medium text-[14px]">
                      {p.nome}{" "}
                      <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                        {p.codigo} · {p.percentual ?? 0}%
                      </span>
                      {!p.ativo && (
                        <span className="ml-2 text-[10px] font-mono uppercase text-red-700">inativo</span>
                      )}
                      {p.papel === "supervisor" && (
                        <span className="ml-2 text-[10px] font-mono uppercase px-1.5 py-0.5 border border-[color:var(--color-accent)] text-[color:var(--color-accent-dim)]">
                          supervisão
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[color:var(--color-ink-muted)]">
                      {s
                        ? `${s.clientes?.length ?? 0} clientes · ${s.projetos?.length ?? 0} projetos · ${pendentes.length} demanda(s) pendente(s) · ${fmtBRL(aReceber)} a pagar`
                        : "Sem dados sincronizados ainda (parceiro precisa abrir a Central)."}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="border-t border-[color:var(--color-hairline)] px-5 py-5 space-y-6 text-[13px]">
                  <PapelEFolha
                    p={p}
                    salvando={salvando}
                    onTogglePapel={() => void togglePapel(p)}
                    onSalvarFin={(f) => void salvarFinanceiro(p, f)}
                  />

                  {s && (<>
                  {/* Demandas p/ validação */}
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
                      Demandas submetidas
                    </div>
                    {(s.trabalhos ?? []).length === 0 && (
                      <p className="text-[color:var(--color-ink-faint)]">Nenhuma demanda.</p>
                    )}
                    {(s.trabalhos ?? []).map((t) => (
                      <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-[color:var(--color-hairline)] last:border-0">
                        <div>
                          <span className="font-medium">{t.titulo}</span>{" "}
                          <span className={`ml-2 font-mono text-[10px] uppercase px-2 py-0.5 border ${
                            t.status === "aprovado" ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                            : t.status === "reprovado" ? "text-red-700 border-red-200 bg-red-50"
                            : t.status === "ressalva" ? "text-amber-700 border-amber-200 bg-amber-50"
                            : "text-[color:var(--color-ink-muted)] border-[color:var(--color-hairline)]"
                          }`}>{t.status}</span>
                          {t.ressalva && (
                            <div className="text-[11px] text-amber-800 mt-0.5">Ressalva: {t.ressalva}</div>
                          )}
                        </div>
                        {t.status === "pendente" && (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={salvando}
                              onClick={() => mudarTrabalho(p, t.id, "aprovado")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Aprovar
                            </button>
                            <button
                              disabled={salvando}
                              onClick={() => {
                                const r = window.prompt("Ressalva para o parceiro:");
                                if (r) mudarTrabalho(p, t.id, "ressalva", r);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] border border-amber-400 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                            >
                              <AlertTriangle className="w-3 h-3" /> Ressalva
                            </button>
                            <button
                              disabled={salvando}
                              onClick={() => mudarTrabalho(p, t.id, "reprovado")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" /> Reprovar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Comissões */}
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
                      Comissões
                    </div>
                    {(s.comissoes ?? []).length === 0 && (
                      <p className="text-[color:var(--color-ink-faint)]">Nenhuma comissão.</p>
                    )}
                    {(s.comissoes ?? []).map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-[color:var(--color-hairline)] last:border-0">
                        <div>
                          <span className="font-medium">{c.descricao}</span>{" "}
                          <span className="font-mono text-[color:var(--color-brand)]">{fmtBRL(Number(c.valor) || 0)}</span>
                          {c.data_pagamento && (
                            <span className="ml-2 text-[11px] text-[color:var(--color-ink-faint)]">pago em {c.data_pagamento}</span>
                          )}
                        </div>
                        <select
                          value={c.status}
                          disabled={salvando}
                          onChange={(e) => mudarComissao(p, c.id, e.target.value)}
                          className="border border-[color:var(--color-hairline)] bg-transparent px-2 py-1 text-[12px]"
                        >
                          <option value="prevista">Prevista</option>
                          <option value="aprovada">Aprovada</option>
                          <option value="paga">Paga</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Diário de desenvolvimento */}
                  {(s.diario?.length ?? 0) > 0 && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
                        Diário de desenvolvimento
                      </div>
                      <div className="border-l-2 border-[color:var(--color-accent)]/40 pl-3 space-y-1.5 max-h-48 overflow-y-auto">
                        {s.diario!.slice(-8).reverse().map((e) => (
                          <div key={e.id} className="text-[12px] leading-relaxed text-[color:var(--color-ink)]">
                            <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] mr-2">
                              {new Date(e.criado_em).toLocaleDateString("pt-BR")}
                            </span>
                            {e.texto}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Arquivos anexados */}
                  {(s.documentos ?? []).some((d) => d.storage_path) && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
                        Arquivos anexados
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(s.documentos ?? []).filter((d) => d.storage_path).map((d) => (
                          <a
                            key={d.id}
                            href={`/api/parceiros/arquivo?path=${encodeURIComponent(d.storage_path!)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] underline underline-offset-2 text-[color:var(--color-brand)] hover:opacity-80"
                          >
                            {d.arquivo_nome || d.nome}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Andamentos de processo */}
                  {(s.projetos ?? []).some((pr) => (pr.andamentos?.length ?? 0) > 0) && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
                        Andamentos de processo
                      </div>
                      {(s.projetos ?? [])
                        .filter((pr) => (pr.andamentos?.length ?? 0) > 0)
                        .map((pr) => (
                          <div key={pr.id} className="mb-3">
                            <div className="font-medium text-[13px] mb-1">{pr.nome}</div>
                            <div className="border-l-2 border-[color:var(--color-brand)]/30 pl-3 space-y-1">
                              {pr.andamentos!.slice(-4).reverse().map((a) => (
                                <div key={a.id} className="text-[12px] text-[color:var(--color-ink)]">
                                  <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] mr-2">
                                    {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                                  </span>
                                  {a.texto}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Carteira resumo */}
                  <div className="text-[11px] text-[color:var(--color-ink-muted)]">
                    Carteira: {(s.clientes ?? []).map((c) => c.nome).join(", ") || "—"} ·
                    Sync {p.snapshot_updated_by === "admin" ? "pelo admin" : "pelo parceiro"} em{" "}
                    {p.snapshot_updated_at ? new Date(p.snapshot_updated_at).toLocaleString("pt-BR") : "—"}
                  </div>
                  </>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ponte pro cliente */}
      <div className="border-2 border-[color:var(--color-brand)]/30 bg-gradient-to-br from-blue-50/40 to-transparent p-6 space-y-4">
        <h3 className="font-serif text-lg">Publicar atualização na Sala do Cliente</h3>
        <p className="text-[12px] text-[color:var(--color-ink-muted)]">
          Trabalho do colaborador validado? Publique o avanço no caso do cliente —
          ele vê imediatamente na Sala Arché.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={pub.caseId}
            onChange={(e) => setPub((x) => ({ ...x, caseId: e.target.value }))}
            className="border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px]"
          >
            <option value="">Selecione o caso do cliente…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.client_profiles?.nome || "Cliente")} — {c.titulo}
              </option>
            ))}
          </select>
          <input
            value={pub.titulo}
            onChange={(e) => setPub((x) => ({ ...x, titulo: e.target.value }))}
            placeholder="Título da atualização"
            className="border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px]"
          />
        </div>
        <textarea
          value={pub.corpo}
          onChange={(e) => setPub((x) => ({ ...x, corpo: e.target.value }))}
          placeholder="Descreva o avanço de forma clara para o cliente…"
          rows={3}
          className="w-full border border-[color:var(--color-hairline)] bg-transparent px-3 py-2.5 text-[13px]"
        />
        <div className="flex items-center gap-4">
          <button
            onClick={() => void publicar()}
            disabled={salvando || !pub.caseId || pub.titulo.length < 3 || pub.corpo.length < 3}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium disabled:opacity-50 hover:-translate-y-0.5 transition-all"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Publicar para o cliente
          </button>
          {pubMsg && <span className="text-[12px] text-[color:var(--color-ink-muted)]">{pubMsg}</span>}
        </div>
      </div>
    </div>
  );
}
