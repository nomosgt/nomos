"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users, AlertTriangle, CalendarClock, CheckCircle2, Loader2, Search,
  ChevronDown, ChevronUp, Plus, History, ListTodo, Eye,
} from "lucide-react";

/**
 * Central de Comando · Colaboradores — visão consolidada com stats reais,
 * agenda de prazos e perfil operacional expansível. Fonte: atividades (v12).
 */

interface Stats {
  total: number; pendentes: number; em_andamento: number; aguardando_revisao: number;
  concluidas: number; canceladas: number; atrasadas: number; urgentes_abertas: number;
  proximo_prazo: string | null; proximo_prazo_titulo: string | null;
  no_prazo: number; fora_prazo: number; tempo_medio_dias: number | null;
}
interface Colab { id: string; codigo: string; nome: string; observacoes: string | null; ativo: boolean; ultimo_acesso: string | null; papel: string; stats: Stats }
interface AgendaItem { id: string; titulo: string; prazo: string | null; prioridade: string; status: string; responsavel: string }
interface Overview { total_colaboradores: number; abertas: number; aguardando_revisao: number; atrasadas: number; prazos_7d: number; concluidas_30d: number }
interface Perfil {
  colaborador: { id: string; codigo: string; nome: string; observacoes: string | null; ativo: boolean; criado_em: string; ultimo_acesso: string | null; papel: string };
  stats: Stats;
  tarefas: { id: string; titulo: string; status: string; prazo: string | null; prioridade: string; cliente: string | null; caso: string | null; alerta: string | null }[];
  historico: { evento: string; autor: string | null; created_at: string; atividade: string }[];
  casos: { id: string; titulo: string }[];
  analises?: { id: string; titulo: string; status: string; versao: number; updated_at: string; cliente: string | null }[];
}

const ANALISE_ST: Record<string, string> = {
  rascunho: "text-gray-600 border-gray-200 bg-gray-50",
  enviada: "text-blue-700 border-blue-200 bg-blue-50",
  em_revisao: "text-indigo-700 border-indigo-200 bg-indigo-50",
  ajustes_solicitados: "text-amber-700 border-amber-200 bg-amber-50",
  aprovada: "text-emerald-700 border-emerald-200 bg-emerald-50",
};
const ANALISE_LABEL: Record<string, string> = {
  rascunho: "Rascunho", enviada: "Enviada", em_revisao: "Em revisão",
  ajustes_solicitados: "Ajustes", aprovada: "Aprovada",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", aguardando_revisao: "Aguard. revisão",
  concluida: "Concluída", cancelada: "Cancelada",
};

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function CentralColaboradores() {
  const [colabs, setColabs] = useState<Colab[] | null>(null);
  const [agenda, setAgenda] = useState<{ atrasadas: AgendaItem[]; hoje: AgendaItem[]; semana: AgendaItem[] } | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [busca, setBusca] = useState("");
  const [soAtraso, setSoAtraso] = useState(false);
  const [ordem, setOrdem] = useState<"prazo" | "pendentes" | "concluidas">("prazo");
  const [aberto, setAberto] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/colaboradores/central", { cache: "no-store" });
      if (!r.ok) { setColabs([]); return; }
      const j = await r.json();
      setColabs(j.colaboradores ?? []); setAgenda(j.agenda ?? null); setOverview(j.overview ?? null);
    } catch { setColabs([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { const t = setInterval(() => void carregar(), 45000); return () => clearInterval(t); }, [carregar]);

  async function abrirPerfil(id: string) {
    if (aberto === id) { setAberto(null); setPerfil(null); return; }
    setAberto(id); setPerfil(null); setCarregandoPerfil(true);
    try {
      const r = await fetch(`/api/admin/colaboradores/central?perfil=${id}`, { cache: "no-store" });
      if (r.ok) setPerfil(await r.json());
    } catch { /* */ }
    setCarregandoPerfil(false);
  }

  const visiveis = useMemo(() => {
    if (!colabs) return [];
    const q = busca.trim().toLowerCase();
    let lista = colabs.filter((c) =>
      (!q || c.nome.toLowerCase().includes(q) || (c.observacoes || "").toLowerCase().includes(q)) &&
      (!soAtraso || c.stats.atrasadas > 0),
    );
    lista = [...lista].sort((a, b) => {
      if (ordem === "pendentes") return (b.stats.pendentes + b.stats.em_andamento) - (a.stats.pendentes + a.stats.em_andamento);
      if (ordem === "concluidas") return b.stats.concluidas - a.stats.concluidas;
      const pa = a.stats.proximo_prazo ? new Date(a.stats.proximo_prazo).getTime() : Infinity;
      const pb = b.stats.proximo_prazo ? new Date(b.stats.proximo_prazo).getTime() : Infinity;
      return pa - pb;
    });
    return lista;
  }, [colabs, busca, soAtraso, ordem]);

  if (colabs === null) return <div className="py-10 text-center text-[color:var(--color-ink-faint)]"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {/* overview */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Card icone={Users} label="Colaboradores" valor={overview.total_colaboradores} />
          <Card icone={ListTodo} label="Em aberto" valor={overview.abertas} />
          <Card icone={CalendarClock} label="Prazos 7 dias" valor={overview.prazos_7d} />
          <Card icone={AlertTriangle} label="Atrasadas" valor={overview.atrasadas} destaque={overview.atrasadas > 0 ? "rose" : undefined} />
          <Card icone={Eye} label="Aguard. revisão" valor={overview.aguardando_revisao} destaque={overview.aguardando_revisao > 0 ? "amber" : undefined} />
          <Card icone={CheckCircle2} label="Concluídas 30d" valor={overview.concluidas_30d} destaque="emerald" />
        </div>
      )}

      {/* agenda de prazos */}
      {agenda && (agenda.atrasadas.length > 0 || agenda.hoje.length > 0 || agenda.semana.length > 0) && (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-3 flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5" /> Agenda de prazos
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Agenda titulo="Atrasadas" itens={agenda.atrasadas} cor="rose" />
            <Agenda titulo="Hoje" itens={agenda.hoje} cor="amber" />
            <Agenda titulo="Próximos 7 dias" itens={agenda.semana} cor="blue" />
          </div>
        </div>
      )}

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador…" className="w-full pl-8 pr-3 py-2 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]" />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-[color:var(--color-ink-muted)]">
          <input type="checkbox" checked={soAtraso} onChange={(e) => setSoAtraso(e.target.checked)} /> Só com atraso
        </label>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} className="border border-[color:var(--color-hairline)] bg-transparent px-2 py-2 text-[12px] focus:outline-none">
          <option value="prazo">Ordenar: próximo prazo</option>
          <option value="pendentes">Ordenar: mais pendentes</option>
          <option value="concluidas">Ordenar: mais concluídas</option>
        </select>
      </div>

      {/* lista de colaboradores */}
      <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
        {visiveis.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[color:var(--color-ink-faint)]">Nenhum colaborador neste filtro.</div>
        ) : visiveis.map((c) => (
          <div key={c.id}>
            <button onClick={() => void abrirPerfil(c.id)} className="w-full text-left p-4 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-[color:var(--color-surface)]/60 transition-colors">
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[14px]">{c.nome}</span>
                  <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">{c.codigo}</span>
                  {!c.ativo && <span className="font-mono text-[9px] uppercase px-1 py-0.5 border border-gray-200 bg-gray-50 text-gray-500">inativo</span>}
                </div>
                <div className="text-[11.5px] text-[color:var(--color-ink-muted)] mt-0.5">{c.observacoes || "—"}</div>
              </div>
              <Mini label="Abertas" v={c.stats.pendentes + c.stats.em_andamento} />
              <Mini label="Revisão" v={c.stats.aguardando_revisao} destaque={c.stats.aguardando_revisao > 0 ? "amber" : undefined} />
              <Mini label="Concluídas" v={c.stats.concluidas} destaque="emerald" />
              <Mini label="Atrasadas" v={c.stats.atrasadas} destaque={c.stats.atrasadas > 0 ? "rose" : undefined} />
              <div className="min-w-[150px] text-right">
                <div className="font-mono text-[9px] uppercase text-[color:var(--color-ink-faint)]">Próximo prazo</div>
                <div className={`text-[12px] font-mono ${c.stats.proximo_prazo && new Date(c.stats.proximo_prazo).getTime() < Date.now() ? "text-rose-700" : ""}`}>{fmtData(c.stats.proximo_prazo)}</div>
              </div>
              {aberto === c.id ? <ChevronUp className="w-4 h-4 text-[color:var(--color-ink-faint)]" /> : <ChevronDown className="w-4 h-4 text-[color:var(--color-ink-faint)]" />}
            </button>

            {/* PERFIL EXPANSÍVEL */}
            {aberto === c.id && (
              <div className="border-t border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]/40 p-5">
                {carregandoPerfil && <div className="py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-[color:var(--color-ink-faint)]" /></div>}
                {perfil && perfil.colaborador.id === c.id && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[color:var(--color-ink-muted)]">
                        <span>Cadastro: <strong>{new Date(perfil.colaborador.criado_em).toLocaleDateString("pt-BR")}</strong></span>
                        <span>Último acesso: <strong>{perfil.colaborador.ultimo_acesso ? fmtData(perfil.colaborador.ultimo_acesso) : "—"}</strong></span>
                        <span>No prazo: <strong className="text-emerald-700">{perfil.stats.no_prazo}</strong> · Fora: <strong className="text-rose-700">{perfil.stats.fora_prazo}</strong></span>
                        <span>Tempo médio: <strong>{perfil.stats.tempo_medio_dias != null ? `${perfil.stats.tempo_medio_dias} dias` : "dados insuficientes"}</strong></span>
                      </div>
                      <Link href={`/admin/atividades?novo=1&parceiro=${c.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-medium hover:-translate-y-0.5 transition-all">
                        <Plus className="w-3.5 h-3.5" /> Nova tarefa / deadline
                      </Link>
                    </div>

                    {/* tarefas */}
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] mb-2 flex items-center gap-1.5"><ListTodo className="w-3 h-3" /> Tarefas ({perfil.tarefas.length})</div>
                      {perfil.tarefas.length === 0 ? (
                        <p className="text-[12px] text-[color:var(--color-ink-faint)]">Nenhuma tarefa atribuída ainda.</p>
                      ) : (
                        <div className="divide-y divide-[color:var(--color-hairline)] border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] max-h-64 overflow-y-auto">
                          {perfil.tarefas.map((t) => (
                            <div key={t.id} className={`px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] ${t.alerta === "atraso" ? "bg-rose-50/40" : ""}`}>
                              <span className="flex-1 min-w-[160px] font-medium">{t.titulo}</span>
                              {t.cliente && <span className="text-[color:var(--color-ink-muted)]">{t.cliente}</span>}
                              <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${t.status === "concluida" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : t.status === "aguardando_revisao" ? "text-amber-700 border-amber-200 bg-amber-50" : "border-[color:var(--color-hairline)]"}`}>{STATUS_LABEL[t.status] || t.status}</span>
                              {t.alerta === "atraso" && <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-rose-700"><AlertTriangle className="w-3 h-3" /> atrasada</span>}
                              <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">{fmtData(t.prazo)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* histórico */}
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> Histórico operacional</div>
                      {perfil.historico.length === 0 ? (
                        <p className="text-[12px] text-[color:var(--color-ink-faint)]">Sem eventos registrados.</p>
                      ) : (
                        <div className="divide-y divide-[color:var(--color-hairline)] border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] max-h-48 overflow-y-auto">
                          {perfil.historico.map((h, i) => (
                            <div key={i} className="px-3 py-1.5 flex flex-wrap items-center gap-x-2 text-[12px]">
                              <span className="font-medium">{h.evento}</span>
                              <span className="text-[color:var(--color-ink-muted)]">· {h.atividade}</span>
                              <span className="ml-auto font-mono text-[10px] text-[color:var(--color-ink-faint)]">{h.autor || "—"} · {fmtData(h.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* análises técnicas */}
                    {perfil.analises && perfil.analises.length > 0 && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] mb-2">Análises técnicas ({perfil.analises.length})</div>
                        <div className="divide-y divide-[color:var(--color-hairline)] border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] max-h-48 overflow-y-auto">
                          {perfil.analises.map((an) => (
                            <Link key={an.id} href={`/admin/analises?abrir=${an.id}`} className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] hover:bg-[color:var(--color-surface)]/60">
                              <span className="flex-1 min-w-[160px] font-medium">{an.titulo}</span>
                              {an.cliente && <span className="text-[color:var(--color-ink-muted)]">{an.cliente}</span>}
                              {an.versao > 1 && <span className="font-mono text-[9px] text-[color:var(--color-brand)]">rev {an.versao}</span>}
                              <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${ANALISE_ST[an.status] || "border-[color:var(--color-hairline)]"}`}>{ANALISE_LABEL[an.status] || an.status}</span>
                              <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">{new Date(an.updated_at).toLocaleDateString("pt-BR")}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* casos vinculados */}
                    {perfil.casos.length > 0 && (
                      <div className="text-[12px] text-[color:var(--color-ink-muted)]">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mr-2">Casos vinculados:</span>
                        {perfil.casos.map((k) => k.titulo).join(" · ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ icone: Icon, label, valor, destaque }: { icone: React.ComponentType<{ className?: string }>; label: string; valor: number; destaque?: "rose" | "amber" | "emerald" }) {
  const cor = destaque === "rose" ? "text-rose-700" : destaque === "amber" ? "text-amber-700" : destaque === "emerald" ? "text-emerald-700" : "text-[color:var(--color-ink)]";
  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-3">
      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[color:var(--color-ink-faint)]"><Icon className="w-3 h-3" /> {label}</div>
      <div className={`font-serif text-2xl mt-1 ${cor}`}>{valor}</div>
    </div>
  );
}

function Mini({ label, v, destaque }: { label: string; v: number; destaque?: "rose" | "amber" | "emerald" }) {
  const cor = destaque === "rose" ? "text-rose-700" : destaque === "amber" ? "text-amber-700" : destaque === "emerald" ? "text-emerald-700" : "";
  return (
    <div className="text-center min-w-[64px]">
      <div className="font-mono text-[9px] uppercase text-[color:var(--color-ink-faint)]">{label}</div>
      <div className={`font-mono text-[15px] ${cor}`}>{v}</div>
    </div>
  );
}

function Agenda({ titulo, itens, cor }: { titulo: string; itens: AgendaItem[]; cor: "rose" | "amber" | "blue" }) {
  const borda = cor === "rose" ? "border-rose-200 bg-rose-50/40" : cor === "amber" ? "border-amber-200 bg-amber-50/40" : "border-blue-200 bg-blue-50/40";
  return (
    <div className={`border p-3 ${borda}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] mb-2">{titulo} ({itens.length})</div>
      {itens.length === 0 ? (
        <p className="text-[11px] text-[color:var(--color-ink-faint)]">Nenhum prazo.</p>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {itens.slice(0, 8).map((i) => (
            <Link key={i.id} href={`/admin/atividades`} className="block text-[12px] hover:underline">
              <span className="font-medium">{i.titulo}</span>
              <span className="text-[color:var(--color-ink-muted)]"> · {i.responsavel} · {fmtData(i.prazo)}</span>
            </Link>
          ))}
          {itens.length > 8 && <div className="text-[10px] text-[color:var(--color-ink-faint)]">+{itens.length - 8}…</div>}
        </div>
      )}
    </div>
  );
}
