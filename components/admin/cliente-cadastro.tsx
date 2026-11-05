"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, History, Check } from "lucide-react";

/**
 * Edição cadastral do cliente — razão social, nome fantasia, CNPJ (validado),
 * contato, telefone, consultor e observações. Com auditoria e sincronização
 * com a Sala. Não altera identidade de autenticação nem vínculos.
 */

interface Perfil {
  user_id: string;
  nome: string; empresa: string | null; nome_fantasia?: string | null;
  cnpj: string | null; cargo: string | null; telefone: string | null;
  consultor?: string | null; observacoes?: string | null; email?: string | null;
}
interface Evento { campo: string; valor_anterior: string | null; valor_novo: string | null; autor_nome: string | null; created_at: string }

function mascaraCnpj(v: string): string {
  const c = v.replace(/\D/g, "").slice(0, 14);
  return c.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

export function ClienteCadastro({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>({
    nome: perfil.nome || "", empresa: perfil.empresa || "", nome_fantasia: perfil.nome_fantasia || "",
    cnpj: perfil.cnpj || "", cargo: perfil.cargo || "", telefone: perfil.telefone || "",
    consultor: perfil.consultor || "", observacoes: perfil.observacoes || "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [hist, setHist] = useState<Evento[] | null>(null);

  async function salvar() {
    setErro(null); setMsg(null); setSalvando(true);
    try {
      const r = await fetch("/api/admin/clientes/cadastro", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: perfil.user_id, ...f }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Falha ao salvar."); setSalvando(false); return; }
      setMsg(j.semAlteracoes ? "Nada a alterar." : "✓ Cadastro atualizado — reflete na Sala.");
      setTimeout(() => setMsg(null), 2500);
      if (hist) void verHistorico(true);
      router.refresh();
    } catch { setErro("Falha de rede."); }
    setSalvando(false);
  }

  async function verHistorico(forcar = false) {
    if (hist && !forcar) { setHist(null); return; }
    const r = await fetch(`/api/admin/clientes/cadastro?client_id=${perfil.user_id}`, { cache: "no-store" });
    const j = await r.json();
    setHist(j.historico ?? []);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Razão social"><input className={inp} value={f.empresa} onChange={(e) => set("empresa", e.target.value)} /></Campo>
        <Campo label="Nome fantasia"><input className={inp} value={f.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} /></Campo>
        <Campo label="CNPJ"><input className={inp} value={f.cnpj} onChange={(e) => set("cnpj", mascaraCnpj(e.target.value))} placeholder="00.000.000/0000-00" /></Campo>
        <Campo label="E-mail (login — somente leitura)"><input className={`${inp} opacity-60`} value={perfil.email || "—"} readOnly /></Campo>
        <Campo label="Contato / responsável"><input className={inp} value={f.nome} onChange={(e) => set("nome", e.target.value)} /></Campo>
        <Campo label="Cargo do contato"><input className={inp} value={f.cargo} onChange={(e) => set("cargo", e.target.value)} /></Campo>
        <Campo label="Telefone"><input className={inp} value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></Campo>
        <Campo label="Consultor designado"><input className={inp} value={f.consultor} onChange={(e) => set("consultor", e.target.value)} /></Campo>
      </div>
      <Campo label="Observações administrativas (internas)">
        <textarea className={`${inp} resize-y`} rows={2} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </Campo>

      {erro && <p className="text-[12px] text-rose-700">{erro}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => void salvar()} disabled={salvando} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] disabled:opacity-60">
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar cadastro
        </button>
        {msg && <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700"><Check className="w-3.5 h-3.5" /> {msg}</span>}
        <button onClick={() => void verHistorico()} className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline ml-auto">
          <History className="w-3 h-3" /> {hist ? "Ocultar" : "Histórico"}
        </button>
      </div>

      {hist && (
        <div className="border border-[color:var(--color-hairline)] divide-y divide-[color:var(--color-hairline)] max-h-56 overflow-y-auto">
          {hist.length === 0 ? (
            <div className="p-3 text-center text-[12px] text-[color:var(--color-ink-faint)]">Sem alterações registradas.</div>
          ) : hist.map((h, i) => (
            <div key={i} className="p-2.5 text-[12px] flex flex-wrap gap-x-2">
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 border border-[color:var(--color-hairline)]">{h.campo}</span>
              <span className="text-[color:var(--color-ink-faint)] line-through">{h.valor_anterior || "—"}</span>
              <span>→ {h.valor_novo || "—"}</span>
              <span className="ml-auto font-mono text-[10px] text-[color:var(--color-ink-faint)]">{h.autor_nome || "admin"} · {new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inp = "w-full border border-[color:var(--color-hairline)] bg-transparent px-2.5 py-2 text-[13px] focus:outline-none focus:border-[color:var(--color-brand)]";
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)] mb-1">{label}</div>{children}</div>;
}
