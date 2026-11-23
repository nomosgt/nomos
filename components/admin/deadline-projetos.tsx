"use client";

/**
 * Deadline dos projetos — réplica funcional da tela do protótipo:
 * KPIs (ativos, etapas X de Y, docs pendentes, próximo marco), stepper de
 * 7 etapas com data por etapa (clique para definir), pendências documentais
 * e checkbox "visível ao cliente". Tudo persistido (v27).
 */

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Kc, StTag, fmtData } from "@/components/shell/proto-ui";

const ETAPAS = ["", "Diagnóstico", "Levantamento documental", "Análise técnica", "Parecer e aprovação", "Habilitação na Receita", "Compensação", "Concluído"];

type Caso = {
  id: string; titulo: string; tese: string | null; status: string; etapa: number;
  prazo: string | null; visivel_cliente: boolean; cliente: string;
  datas: { etapa: number; data: string }[];
  checklist: { id: string; titulo: string; concluido: boolean }[];
};

function dataDe(c: Caso, etapa: number): string | null {
  return c.datas.find((d) => d.etapa === etapa)?.data ?? null;
}
function fmtCurta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${String(d).padStart(2, "0")} DE ${MES[(m || 1) - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ""}`;
}

export function DeadlineProjetos() {
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [temV27, setTemV27] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [novoItem, setNovoItem] = useState("");

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetch("/api/admin/deadline", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao carregar."); setCasos([]); return; }
      setCasos(j.casos || []);
      setTemV27(j.v27 !== false);
    } catch { setErro("Erro de conexão."); setCasos([]); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function chamar(method: string, body?: unknown, qs = "") {
    const r = await fetch("/api/admin/deadline" + qs, {
      method,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.error || "Falha."); return false; }
    await carregar();
    return true;
  }

  function editarData(c: Caso, etapa: number) {
    if (!temV27) { alert("Rode o SQL do deadline-v27 no Supabase para habilitar as datas."); return; }
    const atual = dataDe(c, etapa) || "";
    const v = prompt(`Data da etapa ${etapa} — ${ETAPAS[etapa]} (AAAA-MM-DD; vazio remove):`, atual);
    if (v === null) return;
    void chamar("PUT", { case_id: c.id, etapa, data: v.trim() || null });
  }

  if (casos === null) return <p className="text-[13px] text-[#8a8ca3]">Carregando…</p>;
  if (erro) {
    return (
      <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-[13.5px] text-rose-800">
        {erro} <button className="ml-2 underline" onClick={() => void carregar()}>Tentar novamente</button>
      </div>
    );
  }

  const ativos = casos.filter((c) => c.status !== "concluido");
  const etapasConcluidas = casos.reduce((a, c) => a + Math.max(0, Math.min(7, c.etapa) - (c.status === "concluido" ? 0 : 1)) + (c.status === "concluido" ? 1 : 0), 0);
  const etapasTotal = casos.length * 7;
  const docsPendentes = casos.reduce((a, c) => a + c.checklist.filter((k) => !k.concluido).length, 0);
  const hoje = new Date().toISOString().slice(0, 10);
  const marcos = casos
    .flatMap((c) => c.datas.filter((d) => d.etapa >= c.etapa && d.data >= hoje).map((d) => ({ data: d.data, etapa: d.etapa, caso: c })))
    .sort((a, b) => a.data.localeCompare(b.data));
  const proximo = marcos[0];

  return (
    <div className="space-y-5">
      {!temV27 && (
        <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">
          Datas por etapa, pendências e visibilidade precisam do SQL <strong>deadline-v27</strong> no Supabase.
        </div>
      )}

      {/* KPIs do protótipo */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kc label="Projetos ativos" value={String(ativos.length)} sub="em acompanhamento" />
        <Kc label="Etapas concluídas" value={`${etapasConcluidas} de ${etapasTotal}`} sub="avanço consolidado" />
        <Kc label="Documentos pendentes" value={String(docsPendentes)} sub={docsPendentes > 0 ? "bloqueiam o avanço de etapas" : "nenhuma pendência"} tone={docsPendentes > 0 ? "warn" : "ok"} />
        <Kc
          label="Próximo marco"
          value={proximo ? fmtCurta(proximo.data) : "—"}
          sub={proximo ? `${ETAPAS[proximo.etapa]} · ${proximo.caso.titulo.slice(0, 44)}` : "defina datas nas etapas"}
        />
      </div>

      {/* Steppers por projeto */}
      {casos.length === 0 ? (
        <div className="rounded-[10px] border border-[#e9e6df] bg-white p-10 text-center text-[13px] text-[#8a8ca3]">Nenhum caso ativo.</div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[#e9e6df] bg-white">
          {casos.map((c, idx) => {
            const pend = c.checklist.filter((k) => !k.concluido).length;
            return (
              <div key={c.id} className={`grid grid-cols-1 gap-4 p-5 lg:grid-cols-[270px_1fr] ${idx > 0 ? "border-t border-[#efece6]" : ""}`}>
                {/* coluna esquerda */}
                <div>
                  <div className="text-[14.5px] font-semibold leading-snug text-[#0f1240]">{c.titulo}</div>
                  <div className="mt-1 font-mono text-[11px] text-[#8a8ca3]">
                    {c.cliente}{c.prazo ? ` · prazo ${fmtData(c.prazo)}` : ""}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <StTag tone={c.status === "concluido" ? "ok" : "warn"}>
                      {c.status === "concluido" ? "Concluído" : ETAPAS[c.etapa] || "—"}
                    </StTag>
                    {pend > 0 && <StTag tone="bad">{pend} doc. pendente{pend > 1 ? "s" : ""}</StTag>}
                  </div>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[12.5px] text-[#14173d]">
                    <input
                      type="checkbox"
                      className="accent-[#3a40c9]"
                      checked={c.visivel_cliente}
                      disabled={!temV27}
                      onChange={(e) => void chamar("PATCH", { case_id: c.id, visivel_cliente: e.target.checked })}
                    />
                    visível ao cliente
                  </label>
                  <button
                    className="mt-2 text-[12px] font-semibold text-[#3a40c9] hover:underline"
                    onClick={() => setAberto(aberto === c.id ? null : c.id)}
                  >
                    {aberto === c.id ? "Fechar pendências" : `Pendências documentais (${c.checklist.length})`}
                  </button>
                </div>

                {/* stepper de 7 etapas */}
                <div>
                  <div className="flex items-start">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                      const feita = c.status === "concluido" ? true : n < c.etapa;
                      const atual = c.status !== "concluido" && n === c.etapa;
                      const dt = dataDe(c, n);
                      return (
                        <div key={n} className="flex min-w-0 flex-1 flex-col items-center">
                          <div className="flex w-full items-center">
                            <div className={`h-[2px] flex-1 ${n === 1 ? "opacity-0" : feita || atual ? "bg-[#1d8a5a]" : "bg-[#e5e1d8]"}`} />
                            <button
                              type="button"
                              title={`${ETAPAS[n]} — clique para definir a data`}
                              onClick={() => editarData(c, n)}
                              className={`grid h-8 w-8 flex-none place-items-center rounded-full border-2 text-[12px] font-semibold transition-transform hover:scale-110 ${
                                feita
                                  ? "border-[#1d8a5a] bg-[#1d8a5a] text-white"
                                  : atual
                                    ? "border-[#e3a53a] bg-white text-[#b06d0b]"
                                    : "border-[#e5e1d8] bg-white text-[#9a9aa3]"
                              }`}
                            >
                              {feita ? <Check size={14} strokeWidth={3} /> : n}
                            </button>
                            <div className={`h-[2px] flex-1 ${n === 7 ? "opacity-0" : feita ? "bg-[#1d8a5a]" : "bg-[#e5e1d8]"}`} />
                          </div>
                          <div className="mt-1.5 px-0.5 text-center text-[11px] font-semibold leading-tight text-[#14173d]">
                            {ETAPAS[n]}
                          </div>
                          <div className={`mt-0.5 text-center font-mono text-[9.5px] uppercase tracking-[0.08em] ${atual ? "text-[#b06d0b]" : "text-[#8a8ca3]"}`}>
                            {atual && n === 4 ? "aguardando você" : atual ? "em andamento" : dt ? (feita ? fmtCurta(dt) : `prev. ${fmtCurta(dt)}`) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* checklist expandido */}
                  {aberto === c.id && (
                    <div className="mt-4 rounded-[10px] border border-[#efece6] bg-[#faf9f6] p-4 lg:ml-2">
                      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7a7c95]">Conferência documental</div>
                      {c.checklist.length === 0 && <p className="text-[12.5px] text-[#8a8ca3]">Nenhuma pendência registrada.</p>}
                      <div className="space-y-1.5">
                        {c.checklist.map((k) => (
                          <div key={k.id} className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              className="accent-[#1d8a5a]"
                              checked={k.concluido}
                              onChange={(e) => void chamar("PATCH", { checklist_id: k.id, concluido: e.target.checked })}
                            />
                            <span className={`flex-1 text-[13px] ${k.concluido ? "text-[#9a9aa3] line-through" : "text-[#14173d]"}`}>{k.titulo}</span>
                            <button
                              className="text-[#9a9aa3] hover:text-rose-700"
                              title="Remover"
                              onClick={() => { if (confirm("Remover esta pendência?")) void chamar("DELETE", undefined, `?checklist_id=${k.id}`); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          className="flex-1 rounded-[8px] border border-[#dedbd3] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0f1240]"
                          placeholder="Nova pendência (ex.: Balancete 2024)"
                          value={aberto === c.id ? novoItem : ""}
                          onChange={(e) => setNovoItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && novoItem.trim().length >= 2) {
                              void chamar("POST", { case_id: c.id, titulo: novoItem.trim() }).then((ok) => { if (ok) setNovoItem(""); });
                            }
                          }}
                        />
                        <button
                          className="inline-flex h-[36px] items-center gap-1.5 rounded-[8px] bg-[#0f1240] px-3 text-[12.5px] font-semibold text-white hover:bg-[#3a40c9] disabled:opacity-45"
                          disabled={!temV27 || novoItem.trim().length < 2}
                          onClick={() => void chamar("POST", { case_id: c.id, titulo: novoItem.trim() }).then((ok) => { if (ok) setNovoItem(""); })}
                        >
                          <Plus size={13} /> Adicionar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
