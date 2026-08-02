"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Plus, Loader2, Trash2, Copy, Check, RefreshCw, UserX, UserCheck,
} from "lucide-react";

interface Colaborador {
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  percentual_padrao: number;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
}

interface Credencial {
  email: string;
  temp_password: string;
}

export function ColaboradoresPainel() {
  const [list, setList] = useState<Colaborador[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cred, setCred] = useState<Credencial | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/colaboradores");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro carregando colaboradores.");
        setList([]);
        return;
      }
      setList(json.colaboradores);
    } catch {
      setError("Erro de conexao.");
      setList([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(user_id: string, updates: Partial<Colaborador>) {
    const res = await fetch("/api/admin/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, ...updates }),
    });
    if (res.ok) load();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Erro ao atualizar.");
    }
  }

  async function remover(c: Colaborador) {
    if (!confirm(`Remover ${c.nome}? Isso apaga o acesso ao portal.`)) return;
    const res = await fetch(`/api/admin/colaboradores?user_id=${c.user_id}`, {
      method: "DELETE",
    });
    if (res.ok) load();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Erro ao remover.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? "Fechar formulario" : "Novo colaborador"}
        </button>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 border border-[color:var(--color-hairline)] text-[12px] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {cred && <CredencialCard cred={cred} onClose={() => setCred(null)} />}

      {showForm && (
        <NovoColaboradorForm
          onCreated={(c) => {
            setCred(c);
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && (
        <div className="p-4 border border-amber-200 bg-amber-50 text-[13px] text-amber-900">
          {error}
        </div>
      )}

      {list === null ? (
        <div className="flex items-center gap-2 text-[13px] text-[color:var(--color-ink-muted)] py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : list.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-hairline)] p-10 text-center text-[13px] text-[color:var(--color-ink-muted)]">
          Nenhum colaborador cadastrado ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <ColaboradorRow key={c.user_id} c={c} onPatch={patch} onRemove={remover} />
          ))}
        </div>
      )}
    </div>
  );
}

function ColaboradorRow({
  c, onPatch, onRemove,
}: {
  c: Colaborador;
  onPatch: (id: string, u: Partial<Colaborador>) => void;
  onRemove: (c: Colaborador) => void;
}) {
  const [pct, setPct] = useState(String(c.percentual_padrao));
  const dirty = Number(pct) !== Number(c.percentual_padrao);

  return (
    <div className={`flex flex-wrap items-center gap-4 bg-[color:var(--color-background)] border px-5 py-4 ${c.ativo ? "border-[color:var(--color-hairline)]" : "border-rose-200 opacity-60"}`}>
      <div className="flex-1 min-w-[200px]">
        <div className="text-[14px] font-medium text-[color:var(--color-ink)]">
          {c.nome}
          {!c.ativo && <span className="ml-2 text-[10px] font-mono uppercase text-rose-600">inativo</span>}
        </div>
        <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
          {c.email} {c.telefone ? "· " + c.telefone : ""}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-faint)]">
          Comissao
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          max="100"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="w-20 bg-transparent border border-[color:var(--color-hairline)] px-2 py-1.5 text-[13px] font-mono text-right focus:outline-none focus:border-[color:var(--color-brand)]"
        />
        <span className="text-[12px] text-[color:var(--color-ink-muted)]">%</span>
        {dirty && (
          <button
            onClick={() => onPatch(c.user_id, { percentual_padrao: Number(pct) })}
            className="px-3 py-1.5 bg-[color:var(--color-brand)] text-white text-[11px] font-medium"
          >
            Salvar
          </button>
        )}
      </div>

      <button
        onClick={() => onPatch(c.user_id, { ativo: !c.ativo })}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[color:var(--color-hairline)] text-[11px] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] transition-colors"
        title={c.ativo ? "Desativar acesso" : "Reativar acesso"}
      >
        {c.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
        {c.ativo ? "Desativar" : "Reativar"}
      </button>

      <button
        onClick={() => onRemove(c)}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-300 text-rose-700 text-[11px] hover:bg-rose-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Remover
      </button>
    </div>
  );
}

function NovoColaboradorForm({ onCreated }: { onCreated: (c: Credencial) => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pct, setPct] = useState("10");
  const [senha, setSenha] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          percentual_padrao: Number(pct) || 10,
          observacoes: obs,
          senha: senha || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao criar colaborador.");
        return;
      }
      onCreated({ email: json.email, temp_password: json.temp_password });
    } catch {
      setError("Erro de conexao.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full bg-transparent border border-[color:var(--color-hairline)] px-3 py-2.5 text-[14px] text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-brand)]";

  return (
    <form onSubmit={submit} className="border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand)]">
        Novo colaborador — cria acesso automatico no portal
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">Nome *</label>
        <input required className={input} value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">E-mail (login) *</label>
        <input required type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">Telefone</label>
        <input className={input} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">Comissao padrao (%)</label>
        <input type="number" step="0.5" min="0" max="100" className={input} value={pct} onChange={(e) => setPct(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">
          Senha (opcional — vazio gera senha automatica)
        </label>
        <input type="text" minLength={8} className={input} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Minimo 8 caracteres" />
      </div>
      <div className="md:col-span-2">
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">Observacoes</label>
        <textarea rows={2} className={input} value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>
      {error && <p className="md:col-span-2 text-[12px] text-red-700">{error}</p>}
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar colaborador
        </button>
      </div>
    </form>
  );
}

function CredencialCard({ cred, onClose }: { cred: Credencial; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const texto = `Portal de Parceiros NGT\nURL: https://nomosgt.com.br/parceiros/login\nLogin: ${cred.email}\nSenha: ${cred.temp_password}`;

  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border-2 border-[color:var(--color-brand)] bg-blue-50/50 p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-3">
        ✓ Colaborador criado — credenciais de acesso
      </div>
      <p className="text-[12px] text-[color:var(--color-ink-muted)] mb-4">
        Copie e envie ao colaborador. A senha nao sera exibida novamente.
      </p>
      <pre className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-4 text-[13px] font-mono whitespace-pre-wrap break-all mb-4">
        {texto}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={copiar}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar credenciais"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 border border-[color:var(--color-hairline)] text-[12px] text-[color:var(--color-ink-muted)]"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
