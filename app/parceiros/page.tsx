"use client";

/**
 * Central do Parceiro NGT — SPA com módulos em tabs.
 * v1: dados em localStorage (repository em lib/parceiros/store.ts).
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, FolderKanban, ClipboardCheck, Percent,
  FileText, ScrollText, LogOut, Plus, Download, Pencil, Trash2,
  Search, Menu, X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  loadDB, saveDB, uid, fmtBRL, fmtDate, diffDays, urgencia, exportCSV,
  type DB, type Cliente, type Projeto, type Trabalho, type Comissao,
  type Documento, type Relatorio,
} from "@/lib/parceiros/store";
import {
  Modal, Field, Badge, UrgencyDot, EmptyState,
  inputCls, selectCls, btnBrand, btnGhost, btnDanger,
} from "@/components/parceiros/ui";

type Tab = "painel" | "clientes" | "projetos" | "trabalhos" | "comissoes" | "documentos" | "relatorios";

const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "painel", label: "Dashboard", icon: LayoutDashboard },
  { id: "clientes", label: "Carteira", icon: Users },
  { id: "projetos", label: "Projetos", icon: FolderKanban },
  { id: "trabalhos", label: "Demandas", icon: ClipboardCheck },
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

  useEffect(() => {
    setDb(loadDB());
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
            {tab === "comissoes" && <Comissoes db={db} mutate={mutate} />}
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
  const comissoesPendentes = db.comissoes.filter((c) => c.status !== "paga");
  const totalPendente = comissoesPendentes.reduce((s, c) => s + c.valor, 0);
  const totalPago = db.comissoes.filter((c) => c.status === "paga").reduce((s, c) => s + c.valor, 0);

  return (
    <div>
      <Header title="Dashboard" sub="Visão consolidada da sua parceria com a NGT" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <Metric label="Projetos ativos" value={String(ativos.length)} onClick={() => setTab("projetos")} />
        <Metric label="Prazos ≤ 10 dias" value={String(prazosProximos.length)} accent={prazosProximos.length > 0} onClick={() => setTab("projetos")} />
        <Metric label="Trabalhos pendentes" value={String(trabalhosPendentes.length)} onClick={() => setTab("trabalhos")} />
        <Metric label="Comissões a receber" value={fmtBRL(totalPendente)} onClick={() => setTab("comissoes")} />
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
          <h3 className="font-serif text-lg text-[color:var(--color-ink)] mb-4">Resumo financeiro</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-[color:var(--color-ink-muted)]">Comissões pagas</span>
              <span className="font-mono text-[15px] text-emerald-700 tabular-nums">{fmtBRL(totalPago)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-[color:var(--color-ink-muted)]">A receber (previstas + aprovadas)</span>
              <span className="font-mono text-[15px] text-[color:var(--color-brand)] tabular-nums">{fmtBRL(totalPendente)}</span>
            </div>
            <div className="pt-3 border-t border-[color:var(--color-hairline)] flex justify-between items-baseline">
              <span className="text-[13px] font-medium text-[color:var(--color-ink)]">Total geral</span>
              <span className="font-mono text-[17px] font-medium text-[color:var(--color-ink)] tabular-nums">{fmtBRL(totalPago + totalPendente)}</span>
            </div>
          </div>
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
        sub="Submeta demandas executadas para validação da equipe NGT"
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

function Comissoes({ db, mutate }: { db: DB; mutate: (fn: (d: DB) => DB) => void }) {
  const [modal, setModal] = useState<null | Comissao>(null);
  const [novo, setNovo] = useState(false);

  const totalPago = db.comissoes.filter((c) => c.status === "paga").reduce((s, c) => s + c.valor, 0);
  const totalPend = db.comissoes.filter((c) => c.status !== "paga").reduce((s, c) => s + c.valor, 0);

  function salvar(data: Partial<Comissao>, existing: Comissao | null) {
    mutate((d) => {
      if (existing) {
        d.comissoes = d.comissoes.map((c) => (c.id === existing.id ? { ...c, ...data } : c));
      } else {
        d.comissoes.push({
          id: uid(), projeto_id: data.projeto_id || null, descricao: data.descricao || "",
          percentual: Number(data.percentual) || 0, valor: Number(data.valor) || 0,
          status: (data.status as Comissao["status"]) || "prevista",
          data_pagamento: data.data_pagamento || null, criado_em: new Date().toISOString(),
        });
      }
      return d;
    });
    setModal(null);
    setNovo(false);
  }

  function excluir(id: string) {
    if (!confirm("Excluir esta comissão?")) return;
    mutate((d) => { d.comissoes = d.comissoes.filter((c) => c.id !== id); return d; });
  }

  const projetoNome = (id: string | null) => db.projetos.find((p) => p.id === id)?.nome || "geral";

  return (
    <div>
      <Header
        title="Financeiro"
        sub={`Pagas: ${fmtBRL(totalPago)} · A receber: ${fmtBRL(totalPend)}`}
        actions={
          <>
            <button className={btnGhost} onClick={() => exportCSV("comissoes.csv", db.comissoes as unknown as Record<string, unknown>[])}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button className={btnBrand} onClick={() => setNovo(true)}>
              <Plus className="w-3.5 h-3.5" /> Nova comissão
            </button>
          </>
        }
      />

      {db.comissoes.length === 0 ? (
        <EmptyState title="Nenhuma comissão" body="Registre a primeira comissão prevista da parceria." action={<button className={btnBrand} onClick={() => setNovo(true)}><Plus className="w-3.5 h-3.5" /> Nova comissão</button>} />
      ) : (
        <div className="space-y-2">
          {db.comissoes.map((c) => (
            <div key={c.id} className="flex items-center gap-4 bg-[color:var(--color-background)] border border-[color:var(--color-hairline)] px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[color:var(--color-ink)] truncate">{c.descricao || "Comissão"}</div>
                <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                  {projetoNome(c.projeto_id)} · {c.percentual}% {c.data_pagamento ? "· pago em " + fmtDate(c.data_pagamento) : ""}
                </div>
              </div>
              <div className="font-mono text-[15px] tabular-nums text-[color:var(--color-ink)]">{fmtBRL(c.valor)}</div>
              <Badge status={c.status} />
              <button className={btnGhost} onClick={() => setModal(c)}><Pencil className="w-3.5 h-3.5" /></button>
              <button className={btnDanger} onClick={() => excluir(c.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={novo || !!modal} title={modal ? "Editar comissão" : "Nova comissão"} onClose={() => { setModal(null); setNovo(false); }} wide>
        <ComissaoForm existing={modal} projetos={db.projetos} onSave={salvar} />
      </Modal>
    </div>
  );
}

function ComissaoForm({ existing, projetos, onSave }: { existing: Comissao | null; projetos: Projeto[]; onSave: (d: Partial<Comissao>, e: Comissao | null) => void }) {
  const [f, setF] = useState<Partial<Comissao>>(existing || { status: "prevista" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f, existing); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Descrição *" span2>
        <input required className={inputCls} value={f.descricao || ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
      </Field>
      <Field label="Projeto vinculado" span2>
        <select className={selectCls} value={f.projeto_id || ""} onChange={(e) => setF({ ...f, projeto_id: e.target.value || null })}>
          <option value="">Geral (sem projeto)</option>
          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Field>
      <Field label="Percentual (%)">
        <input type="number" step="0.1" min="0" max="100" className={inputCls} value={f.percentual ?? ""} onChange={(e) => setF({ ...f, percentual: Number(e.target.value) })} />
      </Field>
      <Field label="Valor (R$)">
        <input type="number" step="0.01" min="0" className={inputCls} value={f.valor ?? ""} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} />
      </Field>
      <Field label="Status">
        <select className={selectCls} value={f.status || "prevista"} onChange={(e) => setF({ ...f, status: e.target.value as Comissao["status"] })}>
          <option value="prevista">Prevista</option>
          <option value="aprovada">Aprovada</option>
          <option value="paga">Paga</option>
        </select>
      </Field>
      <Field label="Data do pagamento">
        <input type="date" className={inputCls} value={f.data_pagamento || ""} onChange={(e) => setF({ ...f, data_pagamento: e.target.value })} />
      </Field>
      <div className="md:col-span-2 flex justify-end pt-2">
        <button type="submit" className={btnBrand}>Salvar</button>
      </div>
    </form>
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
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f, existing); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        sub="Relatórios de atividade enviados à equipe NGT"
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
