"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Save, Plus, Send, Bell } from "lucide-react";

interface Caso {
  id: string;
  titulo: string;
  tese: string | null;
  etapa: number;
  status: string;
  potencial_estimado: string | number | null;
  valor_recuperado: string | number;
  proxima_acao: string | null;
}

interface Msg {
  id: string;
  created_at: string;
  conteudo: string;
  autor_tipo: string;
  lido: boolean;
}

interface Cliente {
  user_id: string;
  status: string;
  caixa_recuperado_total: string | number;
}

const STATUS_CLI = ["ativo", "pausado", "finalizado", "inadimplente"];
const STATUS_CASO = ["em_andamento", "pausado", "concluido", "arquivado"];

export function ClientePainel({
  clienteId,
  clienteInicial,
  casosIniciais,
  mensagensIniciais,
}: {
  clienteId: string;
  clienteInicial: Cliente;
  casosIniciais: Caso[];
  mensagensIniciais: Msg[];
}) {
  const [tab, setTab] = useState<"casos" | "updates" | "msgs">("casos");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-[color:var(--color-hairline)]">
        <TabBtn active={tab === "casos"} onClick={() => setTab("casos")}>Casos & status</TabBtn>
        <TabBtn active={tab === "updates"} onClick={() => setTab("updates")}>Postar atualização</TabBtn>
        <TabBtn active={tab === "msgs"} onClick={() => setTab("msgs")}>Mensagens</TabBtn>
      </div>

      {tab === "casos" && (
        <CasosTab clienteId={clienteId} cliente={clienteInicial} casos={casosIniciais} />
      )}
      {tab === "updates" && <UpdatesTab casos={casosIniciais} />}
      {tab === "msgs" && <MsgsTab clienteId={clienteId} mensagensIniciais={mensagensIniciais} />}
    </div>
  );
}

function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[12px] font-mono uppercase tracking-[0.2em] border-b-2 transition-colors -mb-px ${
        active ? "border-[color:var(--color-brand)] text-[color:var(--color-ink)]" : "border-transparent text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}

/* ---- TAB 1: Casos & status ---- */
function CasosTab({ clienteId, cliente, casos }: { clienteId: string; cliente: Cliente; casos: Caso[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState(cliente.status);
  const [recuperado, setRecuperado] = useState(String(cliente.caixa_recuperado_total));
  const [saved, setSaved] = useState(false);

  function saveCliente() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("client_profiles")
        .update({ status, caixa_recuperado_total: Number(recuperado) })
        .eq("user_id", clienteId);
      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    });
  }

  async function novoCaso(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.from("client_cases").insert({
      client_id: clienteId,
      titulo: String(fd.get("titulo") || ""),
      tese: String(fd.get("tese") || "") || null,
      potencial_estimado: Number(fd.get("potencial") || 0) || null,
      proxima_acao: String(fd.get("proxima_acao") || "") || null,
    });
    if (!error) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  async function updateCaso(id: string, patch: Record<string, unknown>) {
    const supabase = createClient();
    await supabase.from("client_cases").update(patch).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5 block">Status do cliente</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2.5 border border-[color:var(--color-hairline)] focus:border-[color:var(--color-ink)] text-[13px] focus:outline-none"
          >
            {STATUS_CLI.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5 block">Caixa recuperado total (R$)</label>
          <input
            type="number"
            min={0}
            value={recuperado}
            onChange={(e) => setRecuperado(e.target.value)}
            className="w-full p-2.5 border border-[color:var(--color-hairline)] focus:border-[color:var(--color-ink)] text-[13px] font-mono focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <button onClick={saveCliente} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] hover:-translate-y-0.5 transition-transform">
            <Save className="w-3 h-3" /> {saved ? "Salvo" : "Salvar"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">Casos</h3>
        {casos.map((c) => (
          <div key={c.id} className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-5">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="font-serif text-lg">{c.titulo}</div>
                {c.tese && <div className="text-[12px] text-[color:var(--color-ink-muted)]">{c.tese}</div>}
              </div>
              <select
                defaultValue={c.status}
                onChange={(e) => updateCaso(c.id, { status: e.target.value })}
                className="p-1.5 border border-[color:var(--color-hairline)] text-[11px] font-mono uppercase tracking-wider focus:outline-none"
              >
                {STATUS_CASO.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
              <div>
                <div className="text-[10px] uppercase font-mono text-[color:var(--color-ink-muted)] mb-1">Etapa (1-7)</div>
                <input
                  type="number" min={1} max={7} defaultValue={c.etapa}
                  onBlur={(e) => updateCaso(c.id, { etapa: Number(e.target.value) })}
                  className="w-16 p-1.5 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]"
                />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-[color:var(--color-ink-muted)] mb-1">Recuperado</div>
                <input
                  type="number" min={0} defaultValue={Number(c.valor_recuperado)}
                  onBlur={(e) => updateCaso(c.id, { valor_recuperado: Number(e.target.value) })}
                  className="w-full p-1.5 border border-[color:var(--color-hairline)] text-[13px] font-mono focus:outline-none focus:border-[color:var(--color-ink)]"
                />
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase font-mono text-[color:var(--color-ink-muted)] mb-1">Próxima ação</div>
                <input
                  defaultValue={c.proxima_acao || ""}
                  onBlur={(e) => updateCaso(c.id, { proxima_acao: e.target.value || null })}
                  className="w-full p-1.5 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]"
                  placeholder="Ex: Aguardando habilitação Receita"
                />
              </div>
            </div>
            {c.potencial_estimado && (
              <div className="mt-3 text-[11px] font-mono text-[color:var(--color-ink-faint)]">
                Potencial: {formatBRL(Number(c.potencial_estimado), { compact: true })}
              </div>
            )}
          </div>
        ))}

        <form onSubmit={novoCaso} className="border-2 border-dashed border-[color:var(--color-hairline)] p-5 space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] flex items-center gap-2">
            <Plus className="w-3 h-3" /> Adicionar caso
          </div>
          <input name="titulo" required placeholder="Título do caso" className="w-full p-2 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]" />
          <input name="tese" placeholder="Tese (opcional)" className="w-full p-2 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]" />
          <div className="grid grid-cols-2 gap-3">
            <input name="potencial" type="number" min={0} placeholder="Potencial estimado (R$)" className="p-2 border border-[color:var(--color-hairline)] text-[13px] font-mono focus:outline-none focus:border-[color:var(--color-ink)]" />
            <input name="proxima_acao" placeholder="Próxima ação" className="p-2 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]" />
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[11px] font-mono uppercase tracking-[0.2em]">
            Criar caso
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---- TAB 2: Postar atualização ---- */
function UpdatesTab({ casos }: { casos: Caso[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  async function postar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("case_updates").insert({
        case_id: String(fd.get("case_id")),
        autor_id: u.user?.id || null,
        titulo: String(fd.get("titulo") || ""),
        corpo: String(fd.get("corpo") || ""),
        tipo: String(fd.get("tipo") || "info"),
      });
      (e.target as HTMLFormElement).reset();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  }

  if (casos.length === 0) {
    return (
      <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-10 text-center text-[13px] text-[color:var(--color-ink-faint)]">
        Crie um caso primeiro na aba “Casos” pra poder postar atualizações.
      </div>
    );
  }

  return (
    <form onSubmit={postar} className="space-y-4 border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5 block">Caso</label>
          <select name="case_id" required className="w-full p-2.5 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]">
            {casos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5 block">Tipo</label>
          <select name="tipo" required className="w-full p-2.5 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]">
            <option value="info">Info</option>
            <option value="marco">Marco</option>
            <option value="recebimento">Recebimento</option>
            <option value="pendencia">Pendência</option>
            <option value="risco">Risco</option>
          </select>
        </div>
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5 block">Título</label>
        <input name="titulo" required className="w-full p-2.5 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)]" />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5 block">Corpo (opcional)</label>
        <textarea name="corpo" rows={5} className="w-full p-2.5 border border-[color:var(--color-hairline)] text-[13px] focus:outline-none focus:border-[color:var(--color-ink)] resize-y" />
      </div>
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] disabled:opacity-60">
        <Bell className="w-3 h-3" />
        {pending ? "Postando…" : saved ? "Postado!" : "Postar atualização"}
      </button>
    </form>
  );
}

/* ---- TAB 3: Mensagens ---- */
function MsgsTab({ clienteId, mensagensIniciais }: { clienteId: string; mensagensIniciais: Msg[] }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState(mensagensIniciais);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    if (!content.trim()) return;
    const text = content.trim();
    setContent("");
    startTransition(async () => {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("case_messages")
        .insert({
          client_id: clienteId,
          autor_id: u.user?.id || null,
          autor_tipo: "admin",
          conteudo: text,
        })
        .select("id, created_at, conteudo, autor_tipo, lido")
        .single();
      if (data) setMsgs((m) => [...m, data as Msg]);
      router.refresh();
    });
  }

  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {msgs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-[color:var(--color-ink-faint)]">
            Sem mensagens ainda.
          </div>
        ) : (
          msgs.map((m) => {
            const fromAdmin = m.autor_tipo === "admin";
            return (
              <div key={m.id} className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%]">
                  <div className={`p-3 text-[14px] ${fromAdmin ? "bg-[color:var(--color-brand)] text-white" : "bg-[color:var(--color-surface)]"}`}>
                    <div className="whitespace-pre-wrap">{m.conteudo}</div>
                  </div>
                  <div className={`mt-1 text-[10px] font-mono text-[color:var(--color-ink-faint)] ${fromAdmin ? "text-right" : ""}`}>
                    {fromAdmin ? "Você (admin)" : "Cliente"} · {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-[color:var(--color-hairline)] p-3 flex items-end gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Responder ao cliente…"
          rows={2}
          className="flex-1 bg-transparent text-[14px] focus:outline-none resize-none"
        />
        <button type="submit" disabled={pending || !content.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[color:var(--color-brand)] text-white text-[12px] font-mono uppercase tracking-[0.2em] disabled:opacity-50">
          <Send className="w-3 h-3" /> Enviar
        </button>
      </form>
    </div>
  );
}
// end of ClientePainel
