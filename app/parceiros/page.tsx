"use client";

/**
 * Central do Parceiro Arché — SPA com módulos em tabs.
 * v1: dados em localStorage (repository em lib/parceiros/store.ts).
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, FolderKanban, ClipboardCheck, Percent,
  FileText, ScrollText, LogOut, Plus, Download, Pencil, Trash2,
  Search, Menu, X, BookOpen, Paperclip, Loader2,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  loadDB, saveDB, uid, fmtDate, diffDays, urgencia, exportCSV,
  fetchCentral,
  type DB, type Cliente, type Projeto, type Trabalho,
  type Documento, type Relatorio, type ColaboradorSupervisao,
} from "@/lib/parceiros/store";
import { FinanceiroCard } from "@/components/parceiros/financeiro-card";
import { SupervisaoView } from "@/components/parceiros/supervisao-view";
import {
  Modal, Field, Badge, UrgencyDot, EmptyState,
  inputCls, selectCls, btnBrand, btnGhost, btnDanger,
} from "@/components/parceiros/ui";
import { InsightsWidget } from "@/components/parceiros/insights-widget";

type Tab = "painel" | "clientes" | "projetos" | "trabalhos" | "diario" | "comissoes" | "documentos" | "relatorios";

const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "painel", label: "Dashboard", icon: LayoutDashboard },
  { id: "clientes", label: "Carteira", icon: Users },
  { id: "projetos", label: "Projetos", icon: FolderKanban },
  { id: "trabalhos", label: "Demandas", icon: ClipboardCheck },
  { id: "diario", label: "Diário", icon: BookOpen },
  { id: "comissoes", label: "Financeiro", icon: Percent },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "relatorios", label: "Relatórios", icon: ScrollText },
];

export default function ParceirosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("painel");
  const [db, setDb] = useState<DB | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [busca, setBusca] = useState("");

  const [supervisao, setSupervisao] = useState<{
    nome: string;
    colaboradores: ColaboradorSupervisao[];
  } | null>(null);

  useEffect(() => {
    // v2: servidor é a fonte da verdade no load (traz edições do admin);
    // localStorage entra como fallback/cache offline.
    let alive = true;
    setDb(loadDB());
    void fetchCentral().then((r) => {
      if (!alive) return;
      if (r.mode === "supervisor") {
        setSupervisao({ nome: r.payload.nome, colaboradores: r.payload.colaboradores });
      } else if (r.mode === "parceiro" && r.db) {
        setDb(r.db);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const mutate = useCallback((fn: (d: DB) => DB) => {
    setDb((prev) => {
      if (!prev) return prev;
      const next = fn(structuredClone(prev));
      saveDB(next);
      return next;
    });
  }, []);

  async function logout() {
    await fetch("/api/parceiros/auth", { method: "DELETE" }).catch(() => {});
    router.push("/parceiros/login");
    router.refresh();
  }

  // Modo supervisão (Dra. Gabriela) — todos os processos, zero financeiro.
  if (supervisao) {
    return (
      <SupervisaoView
        nome={supervisao.nome}
        colaboradores={supervisao.colaboradores}
        logout={logout}
      />
    );
  }

  if (!db) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-ink-faint)] animate-pulse">
          Carregando central…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)] flex">
      <aside className="hidden lg:flex w-64 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex-col px-5 py-8 flex-shrink-0 sticky top-0 h-screen">
        <SidebarContent tab={tab} setTab={setTab} logout={logout} />
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex items-center justify-between px-4 h-14">
        <Logo variant="full" className="h-8 w-auto text-[color:var(--color-paper)]" />
        <button onClick={() => setMobileNav(true)} aria-label="Abrir menu" className="p-2">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {mobileNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex flex-col px-5 py-8"
          >
            <button onClick={() => setMobileNav(false)} className="absolute top-4 right-4 p-2" aria-label="Fechar menu">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent tab={tab} setTab={(t) => { setTab(t); setMobileNav(false); }} logout={logout} />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 px-4 lg:px-10 pt-20 lg:pt-10 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "painel" && <Painel db={db} setTab={setTab} />}
            {tab === "clientes" && <Clientes db={db} mutate={mutate} busca={busca} setBusca={setBusca} />}
            {tab === "projetos" && <Projetos db={db} mutate={mutate} busca={busca} setBusca={setBusca} />}
            {tab === "trabalhos" && <Trabalhos db={db} mutate={mutate} />}
            {tab === "diario" && <Diario db={db} mutate={mutate} />}
            {tab === "comissoes" && <Comissoes db={db} />}
            {tab === "documentos" && <Documentos db={db} mutate={mutate} />}
            {tab === "relatorios" && <Relatorios db={db} mutate={mutate} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarContent({ tab, setTab, logout }: { tab: Tab; setTab: (t: Tab) => void; logout: () => void }) {
  return (
    <>
      <div className="mb-10">
        <Logo variant="full" className="h-10 w-auto text-[color:var(--color-paper)]" />
        <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/45">
          Central do Parceiro
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
              tab === item.id
                ? "bg-[color:var(--color-paper)]/12 text-[color:var(--color-paper)]"
                : "text-[color:var(--color-paper)]/60 hover:bg-[color:var(--color-paper)]/6 hover:text-[color:var(--color-paper)]"
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      <button
        onClick={logout}
        className="mt-8 flex items-center gap-3 px-3 py-2.5 text-[13px] text-[color:var(--color-paper)]/50 hover:text-[color:var(--color-paper)] transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair da central
      </button>
    </>
  );
}

function Painel({ db, setTab }: { db: DB; setTab: (t: Tab) => void }) {
  const ativos = db.projetos.filter((p) => p.status === "em_andamento" || p.status === "aguardando");
  const prazosProximos = ativos
    .filter((p) => { const d = diffDays(p.vencimento); return d !== null && d <= 10; })
    .sort((a, b) => (diffDays(a.vencimento) ?? 99) - (diffDays(b.vencimento) ?? 99));
  const trabalhosPendentes = db.trabalhos.filter((t) => t.status === "pendente");
  const diario = db.diario ?? [];
  const ultimosDiario = diario.slice(-5).reverse();

  return (
    <div>
      <Header title="Dashboard" sub="Visão consolidada da sua parceria com a Arché" />

      <FinanceiroCard />

      <InsightsWidget db={db} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <Metric label="Projetos ativos" value={String(ativos.length)} onClick={() => setTab("projetos")} />
        <Metric label="Prazos ≤ 10 dias" value={String(prazosProximos.length)} accent={prazosProximos.length > 0} onClick={() => setTab("projetos")} />
        <Metric label="Trabalhos pendentes" value={String(trabalhosPendentes.length)} onClick={() => setTab("trabalhos")} />
        <Metric label="Registros no diário" value={String(diario.length)} onClick={() => setTab("diario")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] p-6">
          <h3 className="font-serif text-lg text-[color:var(--color-ink)] mb-4">Próximos vencimentos</h3>
          {prazosProximos.length === 0 ? (
            <p className="text-[13px] text-[color:var(--color-ink-muted)]">Nenhum prazo crítico nos próximos 10 dias.</p>
          ) : (
            <div className="space-y-2">
              {prazosProximos.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border border-[color:var(--color-hairline)] px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[color:var(--color-ink)] truncate">{p.nome}</div>
                    <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">{fmtDate(p.vencimento)}</div>
                  </div>
                  <UrgencyDot level={urgencia(p.vencimento)} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] p-6">
          <h3 className="font-serif text-lg text-[color:var(--color-ink)] mb-4">Diário recente</h3>
          {ultimosDiario.length === 0 ? (
            <p className="text-[13px] text-[color:var(--color-ink-muted)]">
              Nenhum registro ainda. Use o Diário para documentar o desenvolvimento
              dos seus processos — a Arché e a supervisão acompanham.
            </p>
          ) : (
            <div className="space-y-2.5">
              {ultimosDiario.map((e) => (
                <div key={e.id} className="border-l-2 border-[color:var(--color-brand)]/30 pl-3">
                  <div className="font-mono text-[10px] text-[color:var(--color-ink-faint)]">
                    {new Date(e.criado_em).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-[13px] text-[color:var(--color-ink)] line-clamp-2">{e.texto}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Header({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h2 className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)]">{title}</h2>
        {sub && <p className="mt-1 text-[13px] text-[color:var(--color-ink-muted)]">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

function Metric({ label, value, accent, onClick }: { label: string; value: string; accent?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-[color:var(--color-background)] border p-5 transition-all hover:-translate-y-0.5 ${
        accent ? "border-amber-300" : "border-[color:var(--color-hairline)]"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">{label}</div>
      <div className={`font-mono text-xl lg:text-2xl tracking-tight tabular-nums ${accent ? "text-amber-700" : "text-[color:var(--color-ink)]"}`}>{value}</div>
    </button>
  );
}

function SearchBar({ busca, setBusca, placeholder }: { busca: string; setBusca: (s: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-6 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-ink-faint)]" />
      <input className={inputCls + " pl-10"} placeholder={placeholder} value={busca} onChange={(e) => setBusca(e.target.value)} />
    </div>
  );
}

/* ==================== CLIENTES ==================== */

function Clientes({ db, mutate, busca, setBusca }: { db: DB; mutate: (fn: (d: DB) => DB) => void; busca: string; setBusca: (s: string) => void }) {
  const [modal, setModal] = useState<null | Cliente>(null);
  const [novo, setNovo] = useState(false);

  const list = useMemo(() => {
    const q = busca.toLowerCase();
    return db.clientes.filter((c) => !q || c.nome.toLowerCase().includes(q) || c.documento.includes(q));
  }, [db.clientes, busca]);

  function salvar(data: Partial<Cliente>, existing: Cliente | null) {
    mutate((d) => {
      if (existing) {
        d.clientes = d.clientes.map((c) => (c.id === existing.id ? { ...c, ...data } : c));
      } else {
        d.clientes.push({
          id: uid(), nome: data.nome || "", documento: data.documento || "", contato: data.contato || "",
          email: data.email || "", telefone: data.telefone || "", criado_em: new Date().toISOString(),
        });
      }
      return d;
    });
    setModal(null);
    setNovo(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    mutate((d) => { d.clientes = d.clientes.filter((c) => c.id !== id); return d; });
  }

  return (
    <div>
      <Header
        title="Carteira"
        sub={`${db.clientes.length} cadastrado(s)`}
        actions={
          <>
            <button className={btnGhost} onClick={() => exportCSV("clientes.csv", db.clientes as unknown as Record<string, unknown>[])}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button className={btnBrand} onClick={() => setNovo(true)}>
              <Plus className="w-3.5 h-3.5" /> Novo cliente
            </button>
          </>
        }
      />

      <SearchBar busca={busca} setBusca={setBusca} placeholder="Buscar por nome ou documento…" />

      {list.length === 0 ? (
        <EmptyState title="Nenhum cliente" body="Cadastre o primeiro cliente da sua carteira." action={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Novo cliente</button>} />
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-4 bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[color:var(--color-ink)] truncate">{c.nome}</div>
                <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">{c.documento || "sem documento"} · {c.email || "sem email"}</div>
              </div>
              <button className={btnGhost} onClick={() => setModal(c)}><Pencil className="w-3.5 h-3.5" /></button>
              <button className={btnDanger} onClick={() => excluir(c.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={novo || !!modal} title={modal ? "Editar cliente" : "Novo cliente"} onClose={() => { setModal(null); setNovo(false); }} wide>
        <ClienteForm existing={modal} onSave={salvar} />
      </Modal>
    </div>
  );
}

function ClienteForm({ existing, onSave }: { existing: Cliente | null; onSave: (d: Partial<Cliente>, e: Cliente | null) => void }) {
  const [f, setF] = useState<Partial<Cliente>>(existing || {});
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f, existing); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome / razão social *" span2>
        <input required className={inputCls} value={f.nome || ""} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </Field>
      <Field label="CNPJ / CPF">
        <input className={inputCls} value={f.documento || ""} onChange={(e) => setF({ ...f, documento: e.target.value })} />
      </Field>
      <Field label="Nome do contato">
        <input className={inputCls} value={f.contato || ""} onChange={(e) => setF({ ...f, contato: e.target.value })} />
      </Field>
      <Field label="E-mail">
        <input type="email" className={inputCls} value={f.email || ""} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </Field>
      <Field label="Telefone">
        <input className={inputCls} value={f.telefone || ""} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
      </Field>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <button type="submit" className={btnBrand}>Salvar</button>
      </div>
    </form>
  );
}

/* ==================== PROJETOS ==================== */

function Projetos({ db, mutate, busca, setBusca }: { db: DB; mutate: (fn: (d: DB) => DB) => void; busca: string; setBusca: (s: string) => void }) {
  const [modal, setModal] = useState<null | Projeto>(null);
  const [novo, setNovo] = useState(false);
  const [filtro, setFiltro] = useState<string>("todos");

  const list = useMemo(() => {
    const q = busca.toLowerCase();
    return db.projetos
      .filter((p) => filtro === "todos" || p.status === filtro)
      .filter((p) => !q || p.nome.toLowerCase().includes(q))
      .sort((a, b) => (diffDays(a.vencimento) ?? 9e4) - (diffDays(b.vencimento) ?? 9e4));
  }, [db.projetos, busca, filtro]);

  function salvar(data: Partial<Projeto>, existing: Projeto | null) {
    mutate((d) => {
      if (existing) {
        d.projetos = d.projetos.map((p) => (p.id === existing.id ? { ...p, ...data } : p));
      } else {
        d.projetos.push({
          id: uid(), nome: data.nome || "", cliente_id: data.cliente_id || "", etapa: data.etapa || "",
          status: (data.status as Projeto["status"]) || "em_andamento",
          prioridade: (data.prioridade as Projeto["prioridade"]) || "media",
          vencimento: data.vencimento || null, observacoes: data.observacoes || "",
          andamentos: data.andamentos || [],
          criado_em: new Date().toISOString(),
        });
      }
      return d;
    });
    setModal(null);
    setNovo(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir este projeto?")) return;
    mutate((d) => { d.projetos = d.projetos.filter((p) => p.id !== id); return d; });
  }

  const clienteNome = (id: string) => db.clientes.find((c) => c.id === id)?.nome || "—";

  return (
    <div>
      <Header
        title="Projetos"
        sub={`${db.projetos.length} projeto(s)`}
        actions={
          <>
            <button className={btnGhost} onClick={() => exportCSV("projetos.csv", db.projetos as unknown as Record<string, unknown>[])}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button className={btnBrand} onClick={() => setNovo(true)}>
              <Plus className="w-3.5 h-3.5" /> Novo projeto
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {["todos", "em_andamento", "aguardando", "concluido", "arquivado"].map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] border transition-colors ${
              filtro === s
                ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)] border-[color:var(--color-ink)]"
                : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)]"
            }`}
          >
            {s === "todos" ? "Todos" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <SearchBar busca={busca} setBusca={setBusca} placeholder="Buscar projeto…" />

      {list.length === 0 ? (
        <EmptyState title="Nenhum projeto" body="Cadastre o primeiro projeto vinculado a um cliente." action={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Novo projeto</button>} />
      ) : (
        <div className="space-y-2">
          {list.map((p) => {
            const urg = urgencia(p.vencimento);
            return (
              <div key={p.id} className="flex items-center gap-4 bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] px-5 py-4">
                <div
                  className={`w-1 self-stretch flex-shrink-0 ${
                    urg === "vencido" || urg === "critico" ? "bg-rose-500" : urg === "proximo" ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[color:var(--color-ink)] truncate">{p.nome}</div>
                  <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                    {clienteNome(p.cliente_id)} · {p.etapa || "sem etapa"} · vence {fmtDate(p.vencimento)}
                  </div>
                </div>
                <Badge status={p.prioridade} />
                <Badge status={p.status} />
                <button className={btnGhost} onClick={() => setModal(p)}><Pencil className="w-3.5 h-3.5" /></button>
                <button className={btnDanger} onClick={() => excluir(p.id)}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={novo || !!modal} title={modal ? "Editar projeto" : "Novo projeto"} onClose={() => { setModal(null); setNovo(false); }} wide>
        <ProjetoForm existing={modal} clientes={db.clientes} onSave={salvar} />
      </Modal>
    </div>
  );
}

function ProjetoForm({ existing, clientes, onSave }: { existing: Projeto | null; clientes: Cliente[]; onSave: (d: Partial<Projeto>, e: Projeto | null) => void }) {
  const [f, setF] = useState<Partial<Projeto>>(existing || { status: "em_andamento", prioridade: "media" });
  const [novoAndamento, setNovoAndamento] = useState("");

  function addAndamento() {
    const texto = novoAndamento.trim();
    if (texto.length < 3) return;
    setF((prev) => ({
      ...prev,
      andamentos: [
        ...(prev.andamentos ?? []),
        { id: uid(), texto, criado_em: new Date().toISOString() },
      ],
    }));
    setNovoAndamento("");
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f, existing); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome do projeto *" span2>
        <input required className={inputCls} value={f.nome || ""} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </Field>
      <Field label="Cliente">
        <select className={selectCls} value={f.cliente_id || ""} onChange={(e) => setF({ ...f, cliente_id: e.target.value })}>
          <option value="">Selecione…</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Etapa interna">
        <input className={inputCls} value={f.etapa || ""} onChange={(e) => setF({ ...f, etapa: e.target.value })} placeholder="Ex.: Análise documental" />
      </Field>
      <Field label="Status">
        <select className={selectCls} value={f.status || "em_andamento"} onChange={(e) => setF({ ...f, status: e.target.value as Projeto["status"] })}>
          <option value="em_andamento">Em andamento</option>
          <option value="aguardando">Aguardando</option>
          <option value="concluido">Concluído</option>
          <option value="arquivado">Arquivado</option>
        </select>
      </Field>
      <Field label="Prioridade">
        <select className={selectCls} value={f.prioridade || "media"} onChange={(e) => setF({ ...f, prioridade: e.target.value as Projeto["prioridade"] })}>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
      </Field>
      <Field label="Vencimento">
        <input type="date" className={inputCls} value={f.vencimento || ""} onChange={(e) => setF({ ...f, vencimento: e.target.value })} />
      </Field>
      <Field label="Observações" span2>
        <textarea className={inputCls} rows={3} value={f.observacoes || ""} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
      </Field>

      {/* Andamentos do processo — visíveis p/ Arché e supervisão; publicáveis ao cliente */}
      <div className="md:col-span-2 border-t border-[color:var(--color-hairline)] pt-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] mb-2">
          Andamentos do processo
        </div>
        {(f.andamentos?.length ?? 0) > 0 && (
          <div className="mb-3 border-l-2 border-[color:var(--color-brand)]/30 pl-3 space-y-1.5 max-h-40 overflow-y-auto">
            {f.andamentos!.slice().reverse().map((a) => (
              <div key={a.id} className="text-[12px] leading-relaxed text-[color:var(--color-ink)]">
                <span className="font-mono text-[10px] text-[color:var(--color-ink-faint)] mr-2">
                  {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                </span>
                {a.texto}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={novoAndamento}
            onChange={(e) => setNovoAndamento(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAndamento(); } }}
            placeholder="Descreva o avanço do processo — a equipe Arché e a supervisão acompanham em tempo real…"
          />
          <button type="button" onClick={addAndamento} className={btnGhost}>
            Registrar
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[color:var(--color-ink-faint)]">
          Salve o projeto para sincronizar. A Arché valida e publica o avanço na Sala do Cliente.
        </p>
      </div>

      <div className="md:col-span-2 flex justify-end pt-2">
        <button type="submit" className={btnBrand}>Salvar</button>
      </div>
    </form>
  );
}

/* ==================== TRABALHOS ==================== */

function Trabalhos({ db, mutate }: { db: DB; mutate: (fn: (d: DB) => DB) => void }) {
  const [modal, setModal] = useState<null | Trabalho>(null);
  const [novo, setNovo] = useState(false);

  function salvar(data: Partial<Trabalho>, existing: Trabalho | null) {
    mutate((d) => {
      if (existing) {
        d.trabalhos = d.trabalhos.map((t) => (t.id === existing.id ? { ...t, ...data } : t));
      } else {
        d.trabalhos.push({
          id: uid(), titulo: data.titulo || "", projeto_id: data.projeto_id || null,
          descricao: data.descricao || "", fundamentacao: data.fundamentacao || "",
          status: "pendente", ressalva: "", criado_em: new Date().toISOString(),
        });
      }
      return d;
    });
    setModal(null);
    setNovo(false);
  }

  function setStatus(id: string, status: Trabalho["status"], ressalva = "") {
    mutate((d) => {
      d.trabalhos = d.trabalhos.map((t) => (t.id === id ? { ...t, status, ressalva } : t));
      return d;
    });
  }

  function excluir(id: string) {
    if (!confirm("Excluir este trabalho?")) return;
    mutate((d) => { d.trabalhos = d.trabalhos.filter((t) => t.id !== id); return d; });
  }

  const projetoNome = (id: string | null) => db.projetos.find((p) => p.id === id)?.nome || "sem projeto";

  return (
    <div>
      <Header
        title="Demandas"
        sub="Submeta demandas executadas para validação da equipe Arché"
        actions={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Nova demanda</button>}
      />

      {db.trabalhos.length === 0 ? (
        <EmptyState title="Nenhuma demanda submetida" body="Registre a primeira demanda executada para aprovação." action={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Nova demanda</button>} />
      ) : (
        <div className="space-y-2">
          {db.trabalhos.map((t) => (
            <div key={t.id} className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[color:var(--color-ink)] truncate">{t.titulo}</div>
                  <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">{projetoNome(t.projeto_id)} · {fmtDate(t.criado_em)}</div>
                </div>
                <Badge status={t.status} />
                <button className={btnGhost} onClick={() => setModal(t)}><Pencil className="w-3.5 h-3.5" /></button>
                <button className={btnDanger} onClick={() => excluir(t.id)}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {t.ressalva && (
                <div className="mt-3 text-[12px] text-orange-800 bg-orange-50 border border-orange-200 px-3 py-2">
                  Ressalva: {t.ressalva}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={novo || !!modal} title={modal ? "Editar demanda" : "Nova demanda"} onClose={() => { setModal(null); setNovo(false); }} wide>
        <TrabalhoForm existing={modal} projetos={db.projetos} onSave={salvar} onSetStatus={setStatus} />
      </Modal>
    </div>
  );
}

function TrabalhoForm({
  existing, projetos, onSave, onSetStatus,
}: {
  existing: Trabalho | null;
  projetos: Projeto[];
  onSave: (d: Partial<Trabalho>, e: Trabalho | null) => void;
  onSetStatus: (id: string, s: Trabalho["status"], r?: string) => void;
}) {
  const [f, setF] = useState<Partial<Trabalho>>(existing || {});
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f, existing); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Demanda executada *" span2>
        <input required className={inputCls} value={f.titulo || ""} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      </Field>
      <Field label="Projeto vinculado" span2>
        <select className={selectCls} value={f.projeto_id || ""} onChange={(e) => setF({ ...f, projeto_id: e.target.value || null })}>
          <option value="">Nenhum projeto vinculado</option>
          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Field>
      <Field label="Descrição" span2>
        <textarea className={inputCls} rows={3} value={f.descricao || ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
      </Field>
      <Field label="Fundamentação legal" span2>
        <textarea className={inputCls} rows={2} value={f.fundamentacao || ""} onChange={(e) => setF({ ...f, fundamentacao: e.target.value })} placeholder="Base legal / precedentes aplicáveis" />
      </Field>
      {existing && (
        <div className="md:col-span-2 flex flex-wrap gap-2 pt-1">
          <button type="button" className={btnGhost} onClick={() => onSetStatus(existing.id, "aprovado")}>Marcar aprovado</button>
          <button type="button" className={btnGhost} onClick={() => {
            const r = prompt("Descreva a ressalva:") || "";
            if (r) onSetStatus(existing.id, "ressalva", r);
          }}>Com ressalva</button>
          <button type="button" className={btnGhost} onClick={() => onSetStatus(existing.id, "pendente")}>Voltar a pendente</button>
        </div>
      )}
      <div className="md:col-span-2 flex justify-end pt-2">
        <button type="submit" className={btnBrand}>Salvar</button>
      </div>
    </form>
  );
}

/* ==================== COMISSOES ==================== */

/**
 * Financeiro — SOMENTE LEITURA para o colaborador.
 * A única fonte da verdade é a folha definida pela Arché (Livro-Caixa do admin).
 * O colaborador não cria, edita nem exclui comissões.
 */
function Comissoes({ db }: { db: DB; mutate?: (fn: (d: DB) => DB) => void }) {
  void db;
  return (
    <div>
      <Header
        title="Financeiro"
        sub="Sua folha oficial — definida e atualizada exclusivamente pela equipe Arché"
      />
      <FinanceiroCard />
      <div className="mt-6 border border-[color:var(--color-hairline)] bg-[color:var(--color-background)] p-5 text-[13px] text-[color:var(--color-ink-muted)] leading-relaxed">
        Percentual de comissão, valores pendentes e datas de pagamento são
        gerenciados pela Arché no sistema financeiro central. Dúvidas sobre a
        sua folha? Fale com a equipe:{" "}
        <a href="mailto:contato@archebrasil.com.br" className="underline text-[color:var(--color-brand)]">
          contato@archebrasil.com.br
        </a>
        .
      </div>
    </div>
  );
}

/* ==================== DIÁRIO ==================== */

/**
 * Diário de desenvolvimento — registro cronológico livre do colaborador.
 * Cada entrada sincroniza com a Arché e com a supervisão automaticamente.
 */
function Diario({ db, mutate }: { db: DB; mutate: (fn: (d: DB) => DB) => void }) {
  const [texto, setTexto] = useState("");
  const [projetoId, setProjetoId] = useState("");

  const entradas = (db.diario ?? []).slice().reverse();
  const projetoNome = (id: string | null) =>
    db.projetos.find((p) => p.id === id)?.nome || null;

  function registrar() {
    const t = texto.trim();
    if (t.length < 3) return;
    mutate((d) => {
      d.diario = [
        ...(d.diario ?? []),
        { id: uid(), texto: t, projeto_id: projetoId || null, criado_em: new Date().toISOString() },
      ];
      return d;
    });
    setTexto("");
  }

  function excluir(id: string) {
    if (!confirm("Excluir este registro do diário?")) return;
    mutate((d) => {
      d.diario = (d.diario ?? []).filter((e) => e.id !== id);
      return d;
    });
  }

  return (
    <div>
      <Header
        title="Diário"
        sub="Documente o desenvolvimento dos seus processos — a Arché e a supervisão acompanham em tempo real"
      />

      {/* Composer */}
      <div className="bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] p-5 mb-8">
        <textarea
          className={inputCls}
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="O que avançou hoje? Diligências, protocolos, contatos com o cliente, próximos passos…"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className={selectCls + " max-w-xs"}
            value={projetoId}
            onChange={(e) => setProjetoId(e.target.value)}
          >
            <option value="">Registro geral (sem projeto)</option>
            {db.projetos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <button className={btnBrand} onClick={registrar} disabled={texto.trim().length < 3}>
            <Plus className="w-3.5 h-3.5" /> Registrar no diário
          </button>
        </div>
      </div>

      {/* Timeline */}
      {entradas.length === 0 ? (
        <EmptyState
          title="Diário vazio"
          body="Registre o primeiro avanço. Cada entrada fica datada e visível para a equipe Arché e para a supervisão."
        />
      ) : (
        <div className="relative border-l-2 border-[color:var(--color-hairline)] ml-2 pl-6 space-y-6">
          {entradas.map((e) => (
            <div key={e.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[color:var(--color-brand)]" />
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                  {new Date(e.criado_em).toLocaleString("pt-BR")}
                </span>
                {projetoNome(e.projeto_id) && (
                  <span className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)]">
                    {projetoNome(e.projeto_id)}
                  </span>
                )}
                <button
                  className="ml-auto text-[color:var(--color-ink-faint)] hover:text-red-700"
                  onClick={() => excluir(e.id)}
                  aria-label="Excluir registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[14px] leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap">
                {e.texto}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== DOCUMENTOS ==================== */

function Documentos({ db, mutate }: { db: DB; mutate: (fn: (d: DB) => DB) => void }) {
  const [modal, setModal] = useState<null | Documento>(null);
  const [novo, setNovo] = useState(false);

  function salvar(data: Partial<Documento>, existing: Documento | null) {
    mutate((d) => {
      if (existing) {
        d.documentos = d.documentos.map((x) => (x.id === existing.id ? { ...x, ...data } : x));
      } else {
        d.documentos.push({
          id: uid(), nome: data.nome || "", tipo: data.tipo || "Outro",
          projeto_id: data.projeto_id || null, data_envio: data.data_envio || null,
          observacoes: data.observacoes || "", criado_em: new Date().toISOString(),
        });
      }
      return d;
    });
    setModal(null);
    setNovo(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir este documento?")) return;
    mutate((d) => { d.documentos = d.documentos.filter((x) => x.id !== id); return d; });
  }

  const projetoNome = (id: string | null) => db.projetos.find((p) => p.id === id)?.nome || "geral";

  return (
    <div>
      <Header
        title="Documentos"
        sub="Registro de documentos enviados e recebidos"
        actions={
          <>
            <button className={btnGhost} onClick={() => exportCSV("documentos.csv", db.documentos as unknown as Record<string, unknown>[])}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button className={btnBrand} onClick={() => setNovo(true)}>
              <Plus className="w-3.5 h-3.5" /> Novo documento
            </button>
          </>
        }
      />

      {db.documentos.length === 0 ? (
        <EmptyState title="Nenhum documento" body="Registre o primeiro documento da parceria." action={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Novo documento</button>} />
      ) : (
        <div className="space-y-2">
          {db.documentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] px-5 py-4">
              <FileText className="w-4 h-4 text-[color:var(--color-brand)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[color:var(--color-ink)] truncate">{doc.nome}</div>
                <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                  {doc.tipo} · {projetoNome(doc.projeto_id)} · {fmtDate(doc.data_envio)}
                </div>
              </div>
              {doc.storage_path && (
                <a
                  href={`/api/parceiros/arquivo?path=${encodeURIComponent(doc.storage_path)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnGhost}
                  title={doc.arquivo_nome || "Baixar arquivo"}
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </a>
              )}
              <button className={btnGhost} onClick={() => setModal(doc)}><Pencil className="w-3.5 h-3.5" /></button>
              <button className={btnDanger} onClick={() => excluir(doc.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={novo || !!modal} title={modal ? "Editar documento" : "Novo documento"} onClose={() => { setModal(null); setNovo(false); }} wide>
        <DocumentoForm existing={modal} projetos={db.projetos} onSave={salvar} />
      </Modal>
    </div>
  );
}

function DocumentoForm({ existing, projetos, onSave }: { existing: Documento | null; projetos: Projeto[]; onSave: (d: Partial<Documento>, e: Documento | null) => void }) {
  const [f, setF] = useState<Partial<Documento>>(existing || {});
  const [enviando, setEnviando] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);

  async function anexar(file: File) {
    setEnviando(true);
    setErroUpload(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/parceiros/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        setErroUpload(j.error || "Falha no upload.");
        return;
      }
      setF((prev) => ({
        ...prev,
        storage_path: j.path,
        arquivo_nome: j.nome,
        nome: prev.nome || j.nome,
      }));
    } catch {
      setErroUpload("Erro de conexão no upload.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f, existing); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Anexo real — Supabase Storage */}
      <div className="md:col-span-2 border border-dashed border-[color:var(--color-brand)]/40 bg-blue-50/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Paperclip className="w-4 h-4 text-[color:var(--color-brand)]" />
          <label className="cursor-pointer text-[13px] font-medium text-[color:var(--color-brand)] underline underline-offset-2">
            {enviando ? "Enviando…" : f.storage_path ? "Trocar arquivo" : "Anexar arquivo do processo"}
            <input
              type="file"
              className="hidden"
              disabled={enviando}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) void anexar(file); }}
            />
          </label>
          {enviando && <Loader2 className="w-4 h-4 animate-spin text-[color:var(--color-brand)]" />}
          {f.arquivo_nome && !enviando && (
            <span className="text-[12px] text-[color:var(--color-ink-muted)]">
              ✓ {f.arquivo_nome}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-[color:var(--color-ink-faint)]">
          PDF, imagem, Word, Excel, CSV ou ZIP · até 15MB · armazenado com acesso restrito (você, a Arché e a supervisão).
        </p>
        {erroUpload && <p className="mt-1 text-[12px] text-red-700">{erroUpload}</p>}
      </div>

      <Field label="Nome do documento *" span2>
        <input required className={inputCls} value={f.nome || ""} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </Field>
      <Field label="Tipo">
        <select className={selectCls} value={f.tipo || "Outro"} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
          {["Contrato", "Procuração", "SPED", "XML/NF", "Balancete", "Petição", "Relatório", "Outro"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Projeto vinculado">
        <select className={selectCls} value={f.projeto_id || ""} onChange={(e) => setF({ ...f, projeto_id: e.target.value || null })}>
          <option value="">Geral</option>
          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Field>
      <Field label="Data de envio">
        <input type="date" className={inputCls} value={f.data_envio || ""} onChange={(e) => setF({ ...f, data_envio: e.target.value })} />
      </Field>
      <Field label="Observações" span2>
        <textarea className={inputCls} rows={2} value={f.observacoes || ""} onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
      </Field>
      <div className="md:col-span-2 flex justify-end pt-2">
        <button type="submit" className={btnBrand}>Salvar</button>
      </div>
    </form>
  );
}

/* ==================== RELATORIOS ==================== */

function Relatorios({ db, mutate }: { db: DB; mutate: (fn: (d: DB) => DB) => void }) {
  const [modal, setModal] = useState<null | Relatorio>(null);
  const [novo, setNovo] = useState(false);

  function salvar(data: Partial<Relatorio>, existing: Relatorio | null) {
    mutate((d) => {
      if (existing) {
        d.relatorios = d.relatorios.map((r) => (r.id === existing.id ? { ...r, ...data } : r));
      } else {
        d.relatorios.push({
          id: uid(), periodo: data.periodo || "", resumo: data.resumo || "",
          conteudo: data.conteudo || "", criado_em: new Date().toISOString(),
        });
      }
      return d;
    });
    setModal(null);
    setNovo(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir este relatório?")) return;
    mutate((d) => { d.relatorios = d.relatorios.filter((r) => r.id !== id); return d; });
  }

  return (
    <div>
      <Header
        title="Relatórios periódicos"
        sub="Relatórios de atividade enviados à equipe Arché"
        actions={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Novo relatório</button>}
      />

      {db.relatorios.length === 0 ? (
        <EmptyState title="Nenhum relatório" body="Crie o primeiro relatório periódico de atividades." action={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Novo relatório</button>} />
      ) : (
        <div className="space-y-2">
          {db.relatorios.map((r) => (
            <div key={r.id} className="flex items-center gap-4 bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] px-5 py-4">
              <ScrollText className="w-4 h-4 text-[color:var(--color-brand)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[color:var(--color-ink)] truncate">{r.periodo}</div>
                <div className="text-[12px] text-[color:var(--color-ink-muted)] truncate">{r.resumo}</div>
              </div>
              <button className={btnGhost} onClick={() => setModal(r)}><Pencil className="w-3.5 h-3.5" /></button>
              <button className={btnDanger} onClick={() => excluir(r.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={novo || !!modal} title={modal ? "Editar relatório" : "Novo relatório"} onClose={() => { setModal(null); setNovo(false); }} wide>
        <RelatorioForm existing={modal} onSave={salvar} />
      </Modal>
    </div>
  );
}

function RelatorioForm({ existing, onSave }: { existing: Relatorio | null; onSave: (d: Partial<Relatorio>, e: Relatorio | null) => void }) {
  const [f, setF] = useState<Partial<Relatorio>>(existing || {});
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f, existing); }} className="grid grid-cols-1 gap-4">
      <Field label="Período de referência *">
        <input required className={inputCls} value={f.periodo || ""} onChange={(e) => setF({ ...f, periodo: e.target.value })} placeholder="Ex.: Julho/2026" />
      </Field>
      <Field label="Resumo (aparece na listagem)">
        <input className={inputCls} value={f.resumo || ""} onChange={(e) => setF({ ...f, resumo: e.target.value })} />
      </Field>
      <Field label="Conteúdo do relatório">
        <textarea className={inputCls} rows={6} value={f.conteudo || ""} onChange={(e) => setF({ ...f, conteudo: e.target.value })} />
      </Field>
      <div className="flex justify-end pt-2">
        <button type="submit" className={btnBrand}>Salvar</button>
      </div>
    </form>
  );
}
