"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle, Clock, Filter,
} from "lucide-react";
import {
  Modal, Field, inputCls, selectCls, btnBrand, EmptyState,
} from "@/components/parceiros/ui";

/**
 * Admin · Atividades — centro de comando do gestor.
 * Cria, atribui (advogada + cliente + caso), define prazo/prioridade,
 * acompanha status e atrasos em tempo real.
 */

interface Atividade {
  id: string; titulo: string; descricao: string | null; prioridade: string;
  status: string; prazo: string | null; concluida_em: string | null; visivel_cliente: boolean;
  parceiro_id: string | null; client_id: string | null; case_id: string | null;
  responsavel_nome: string | null; cliente_nome: string | null; cliente_empresa: string | null;
  caso_titulo: string | null; alerta: "atraso" | "aviso_24h" | "aviso_48h" | null;
}
interface Overview { pendentes: number; em_andamento: number; concluidas: number; atrasadas: number; avisos: number }
interface Colab { id: string; nome: string; codigo: string; ativo?: boolean }
interface Caso { id: string; titulo: string; status: string }
interface Cliente { user_id: string; nome: string; empresa: string | null; casos: Caso[] }

const PRIO_CLS: Record<string, string> = {
  alta: "text-rose-700 border-rose-200 bg-rose-50",
  media: "text-amber-700 border-amber-200 bg-amber-50",
  baixa: "text-gray-600 border-gray-200 bg-gray-50",
};
const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída" };
const ALERTA_LABEL: Record<string, string> = { atraso: "Atrasada", aviso_24h: "Vence em 24h", aviso_48h: "Vence em 48h" };

function isoLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtPrazo(iso: string | null): string {
  if (!iso) return "sem prazo";
  const d = new Date(iso); if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const vazia = (): Partial<Atividade> => ({ prioridade: "media", status: "pendente", visivel_cliente: false });

export function AtividadesAdmin() {
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [fResp, setFResp] = useState("");
  const [fCli, setFCli] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [soAtraso, setSoAtraso] = useState(false);

  const [modal, setModal] = useState<Partial<Atividade> | null>(null);

  const carregar = useCallback(async () => {
    try {
      const sp = new URLSearchParams({ overview: "1" });
      if (fResp) sp.set("parceiro_id", fResp);
      if (fCli) sp.set("client_id", fCli);
      if (fStatus) sp.set("status", fStatus);
      if (soAtraso) sp.set("atraso", "1");
      const r = await fetch(`/api/admin/atividades?${sp}`, { cache: "no-store" });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErro((j as { error?: string }).error || "Falha ao carregar."); setAtividades([]); setOverview(null); return; }
      const j = await r.json();
      setErro(null); setAtividades(j.atividades ?? []); setOverview(j.overview ?? null);
    } catch { setErro("Erro de conexão."); }
  }, [fResp, fCli, fStatus, soAtraso]);

  useEffect(() => {
    fetch("/api/admin/colaboradores", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((j) => {
      const lista = (j && (j.codigos || j.colaboradores || j)) || [];
      if (Array.isArray(lista)) setColabs(lista.filter((c: Colab) => c.ativo !== false));
    }).catch(() => {});
    fetch("/api/admin/clientes/documentos", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((j) => {
      if (j?.clientes) setClientes(j.clientes);
    }).catch(() => {});
  }, []);

  useEffect(() => { const t = setTimeout(() => void carregar(), 200); return () => clearTimeout(t); }, [carregar]);
  useEffect(() => { const t = setInterval(() => void carregar(), 30000); return () => clearInterval(t); }, [carregar]);

  async function mudarStatus(a: Atividade, status: string) {
    setAtividades((prev) => (prev ?? []).map((x) => (x.id === a.id ? { ...x, status } : x)));
    await fetch("/api/admin/atividades", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, status }) });
    void carregar();
  }
  async function excluir(a: Atividade) {
    if (!confirm(`Excluir a atividade "${a.titulo}"?`)) return;
    const r = await fetch(`/api/admin/atividades?id=${a.id}`, { method: "DELETE" });
    if (r.ok) { setAtividades((prev) => (prev ?? []).filter((x) => x.id !== a.id)); void carregar(); }
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Ov label="Pendentes" valor={overview.pendentes} />
          <Ov label="Em andamento" valor={overview.em_andamento} cor="text-[color:var(--color-brand)]" />
          <Ov label="Concluídas" valor={overview.concluidas} cor="text-emerald-700" />
          <Ov label="Atrasadas" valor={overview.atrasadas} cor="text-rose-700" alerta={overview.atrasadas > 0} />
          <Ov label="Vencem em 48h" valor={overview.avisos} cor="text-amber-700" alerta={overview.avisos > 0} />
        </div>
      )}

      {/* Filtros + nova */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mr-1">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </div>
        <select className={selectCls + " w-auto"} value={fResp} onChange={(e) => setFResp(e.target.value)}>
          <option value="">Toda advogada</option>
          {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className={selectCls + " w-auto"} value={fCli} onChange={(e) => setFCli(e.target.value)}>
          <option value="">Todo cliente</option>
          {clientes.map((c) => <option key={c.user_id} value={c.user_id}>{c.nome}</option>)}
        </select>
        <select className={selectCls + " w-auto"} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todo status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-ink-muted)] cursor-pointer px-2">
          <input type="checkbox" className="w-3.5 h-3.5 accent-rose-600" checked={soAtraso} onChange={(e) => setSoAtraso(e.target.checked)} />
          Só atrasadas
        </label>
        <button onClick={() => setModal(vazia())} className={btnBrand + " ml-auto"}><Plus className="w-3.5 h-3.5" /> Nova atividade</button>
      </div>

      {erro && <p className="text-[13px] text-rose-700">{erro}</p>}

      {/* Lista */}
      {atividades === null ? (
        <div className="flex items-center gap-2 text-[color:var(--color-ink-faint)] py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Carregando…</span>
        </div>
      ) : atividades.length === 0 ? (
        <EmptyState title="Nenhuma atividade" body={erro ? "Rode o SQL do atividades-v12 no Supabase." : "Crie a primeira atividade e atribua a uma advogada."} action={<button onClick={() => setModal(vazia())} className={btnBrand}><Plus className="w-3.5 h-3.5" /> Nova atividade</button>} />
      ) : (
        <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] bg-[color:var(--color-background)]">
          {atividades.map((a) => (
            <div key={a.id} className={`p-4 flex flex-wrap items-center gap-x-4 gap-y-2 ${a.alerta === "atraso" ? "bg-rose-50/40" : ""}`}>
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[14px] text-[color:var(--color-ink)]">{a.titulo}</span>
                  <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${PRIO_CLS[a.prioridade]}`}>{a.prioridade}</span>
                  {a.alerta && (
                    <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 border ${a.alerta === "atraso" ? "text-rose-700 border-rose-200 bg-rose-50" : "text-amber-700 border-amber-200 bg-amber-50"}`}>
                      {a.alerta === "atraso" ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {ALERTA_LABEL[a.alerta]}
                    </span>
                  )}
                  {a.visivel_cliente && <span className="font-mono text-[9px] uppercase text-[color:var(--color-brand)]">● visível ao cliente</span>}
                </div>
                <div className="text-[11.5px] text-[color:var(--color-ink-muted)] mt-0.5 flex flex-wrap gap-x-3">
                  <span>{a.responsavel_nome || "sem responsável"}</span>
                  {a.cliente_nome && <span>· {a.cliente_nome}{a.cliente_empresa ? ` (${a.cliente_empresa})` : ""}</span>}
                  {a.caso_titulo && <span>· {a.caso_titulo}</span>}
                  <span className="font-mono text-[color:var(--color-ink-faint)]">· {fmtPrazo(a.prazo)}</span>
                </div>
              </div>
              <select value={a.status} onChange={(e) => void mudarStatus(a, e.target.value)} className="border border-[color:var(--color-hairline)] bg-transparent px-2 py-1 text-[12px]">
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={() => setModal(a)} className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-brand)]"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => void excluir(a)} className="p-1.5 text-[color:var(--color-ink-faint)] hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal open title={modal.id ? "Editar atividade" : "Nova atividade"} onClose={() => setModal(null)} wide>
          <AtividadeForm existing={modal} colabs={colabs} clientes={clientes} onSaved={() => { setModal(null); void carregar(); }} />
        </Modal>
      )}
    </div>
  );
}

function Ov({ label, valor, cor, alerta }: { label: string; valor: number; cor?: string; alerta?: boolean }) {
  return (
    <div className={`border p-4 ${alerta ? "border-rose-200 bg-rose-50/40" : "border-[color:var(--color-hairline)] bg-[color:var(--color-background)]"}`}>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">{label}</div>
      <div className={`font-serif text-3xl ${cor || "text-[color:var(--color-ink)]"}`}>{valor}</div>
    </div>
  );
}

function AtividadeForm({
  existing, colabs, clientes, onSaved,
}: {
  existing: Partial<Atividade>; colabs: Colab[]; clientes: Cliente[]; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<Atividade>>(existing);
  const [prazoLocal, setPrazoLocal] = useState(isoLocal(existing.prazo ?? null));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const casosDoCliente = useMemo(
    () => clientes.find((c) => c.user_id === f.client_id)?.casos ?? [],
    [clientes, f.client_id],
  );

  async function salvar() {
    if ((f.titulo || "").trim().length < 2) { setErro("Dê um título à atividade."); return; }
    setSalvando(true); setErro(null);
    try {
      const payload = {
        titulo: f.titulo, descricao: f.descricao || null,
        parceiro_id: f.parceiro_id || null, client_id: f.client_id || null, case_id: f.case_id || null,
        prioridade: f.prioridade || "media", visivel_cliente: !!f.visivel_cliente,
        prazo: prazoLocal ? new Date(prazoLocal).toISOString() : null,
        ...(existing.id ? { status: f.status } : {}),
      };
      const r = existing.id
        ? await fetch("/api/admin/atividades", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: existing.id, ...payload }) })
        : await fetch("/api/admin/atividades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao salvar."); return; }
      onSaved();
    } catch { setErro("Erro de conexão."); } finally { setSalvando(false); }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Título *" span2><input className={inputCls} value={f.titulo || ""} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Protocolar pedido administrativo" /></Field>
      <Field label="Descrição" span2><textarea className={inputCls} rows={2} value={f.descricao || ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Field>
      <Field label="Responsável (advogada)">
        <select className={selectCls} value={f.parceiro_id || ""} onChange={(e) => setF({ ...f, parceiro_id: e.target.value || null })}>
          <option value="">— selecione —</option>
          {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Prioridade">
        <select className={selectCls} value={f.prioridade || "media"} onChange={(e) => setF({ ...f, prioridade: e.target.value })}>
          <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
        </select>
      </Field>
      <Field label="Cliente">
        <select className={selectCls} value={f.client_id || ""} onChange={(e) => setF({ ...f, client_id: e.target.value || null, case_id: null })}>
          <option value="">— nenhum —</option>
          {clientes.map((c) => <option key={c.user_id} value={c.user_id}>{c.nome}{c.empresa ? ` (${c.empresa})` : ""}</option>)}
        </select>
      </Field>
      <Field label="Processo / serviço">
        <select className={selectCls} value={f.case_id || ""} onChange={(e) => setF({ ...f, case_id: e.target.value || null })} disabled={!f.client_id}>
          <option value="">{f.client_id ? "— nenhum —" : "selecione o cliente"}</option>
          {casosDoCliente.map((k) => <option key={k.id} value={k.id}>{k.titulo}</option>)}
        </select>
      </Field>
      <Field label="Prazo (data e hora)"><input type="datetime-local" className={inputCls} value={prazoLocal} onChange={(e) => setPrazoLocal(e.target.value)} /></Field>
      {existing.id && (
        <Field label="Status">
          <select className={selectCls} value={f.status || "pendente"} onChange={(e) => setF({ ...f, status: e.target.value })}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      )}
      <label className="md:col-span-2 flex items-center gap-2 text-[13px] text-[color:var(--color-ink)] cursor-pointer">
        <input type="checkbox" className="w-4 h-4 accent-[color:var(--color-brand)]" checked={!!f.visivel_cliente} onChange={(e) => setF({ ...f, visivel_cliente: e.target.checked })} />
        Ao concluir, publicar uma atualização no portal do cliente (requer cliente + processo).
      </label>
      {erro && <p className="md:col-span-2 text-[12px] text-rose-700">{erro}</p>}
      <div className="md:col-span-2 flex justify-end">
        <button onClick={() => void salvar()} disabled={salvando} className={btnBrand}>
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Salvar atividade
        </button>
      </div>
    </div>
  );
}
