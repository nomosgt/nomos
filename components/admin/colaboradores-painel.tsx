"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Plus, Loader2, Trash2, Copy, Check, RefreshCw, UserX, UserCheck, KeyRound,
} from "lucide-react";

interface CodigoRow {
  id: string;
  codigo: string;
  nome: string;
  percentual: number;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  ultimo_acesso: string | null;
}

export function ColaboradoresPainel() {
  const [list, setList] = useState<CodigoRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState<{ codigo: string; nome: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/colaboradores");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro carregando codigos.");
        setList([]);
        return;
      }
      setList(json.codigos);
    } catch {
      setError("Erro de conexao.");
      setList([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, updates: Partial<CodigoRow>) {
    const res = await fetch("/api/admin/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) load();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Erro ao atualizar.");
    }
  }

  async function remover(c: CodigoRow) {
    if (!confirm(`Excluir o codigo de ${c.nome}? O acesso sera cortado.`)) return;
    const res = await fetch(`/api/admin/colaboradores?id=${c.id}`, { method: "DELETE" });
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
          {showForm ? "Fechar formulario" : "Gerar codigo de colaborador"}
        </button>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 border border-[color:var(--color-hairline)] text-[12px] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {novoCodigo && (
        <CodigoCard data={novoCodigo} onClose={() => setNovoCodigo(null)} />
      )}

      {showForm && (
        <NovoCodigoForm
          onCreated={(c) => {
            setNovoCodigo(c);
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
          Nenhum codigo gerado ainda. Clique em &quot;Gerar codigo de colaborador&quot;.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <CodigoRowItem key={c.id} c={c} onPatch={patch} onRemove={remover} />
          ))}
        </div>
      )}
    </div>
  );
}

function CodigoRowItem({
  c, onPatch, onRemove,
}: {
  c: CodigoRow;
  onPatch: (id: string, u: Partial<CodigoRow>) => void;
  onRemove: (c: CodigoRow) => void;
}) {
  const [pct, setPct] = useState(String(c.percentual));
  const [copied, setCopied] = useState(false);
  const dirty = Number(pct) !== Number(c.percentual);

  function copiar() {
    navigator.clipboard.writeText(c.codigo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={`flex flex-wrap items-center gap-4 bg-[color:var(--color-background)] border px-5 py-4 ${c.ativo ? "border-[color:var(--color-hairline)]" : "border-rose-200 opacity-60"}`}>
      <button
        onClick={copiar}
        className="inline-flex items-center gap-2 px-3 py-2 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] font-mono text-[13px] tracking-[0.1em]"
        title="Copiar codigo"
      >
        <KeyRound className="w-3.5 h-3.5" />
        {c.codigo}
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
      </button>

      <div className="flex-1 min-w-[160px]">
        <div className="text-[14px] font-medium text-[color:var(--color-ink)]">
          {c.nome}
          {!c.ativo && <span className="ml-2 text-[10px] font-mono uppercase text-rose-600">desativado</span>}
        </div>
        <div className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
          {c.ultimo_acesso
            ? "ultimo acesso " + new Date(c.ultimo_acesso).toLocaleDateString("pt-BR")
            : "nunca acessou"}
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
            onClick={() => onPatch(c.id, { percentual: Number(pct) })}
            className="px-3 py-1.5 bg-[color:var(--color-brand)] text-white text-[11px] font-medium"
          >
            Salvar
          </button>
        )}
      </div>

      <button
        onClick={() => onPatch(c.id, { ativo: !c.ativo })}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-[color:var(--color-hairline)] text-[11px] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] transition-colors"
      >
        {c.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
        {c.ativo ? "Desativar" : "Reativar"}
      </button>

      <button
        onClick={() => onRemove(c)}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-300 text-rose-700 text-[11px] hover:bg-rose-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Excluir
      </button>
    </div>
  );
}

function NovoCodigoForm({ onCreated }: { onCreated: (c: { codigo: string; nome: string }) => void }) {
  const [nome, setNome] = useState("");
  const [pct, setPct] = useState("10");
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
          percentual: Number(pct) || 10,
          observacoes: obs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao gerar codigo.");
        return;
      }
      onCreated({ codigo: json.codigo, nome });
      setNome("");
      setPct("10");
      setObs("");
    } catch {
      setError("Erro de conexao.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full bg-transparent border border-[color:var(--color-hairline)] px-3 py-2.5 text-[14px] text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-brand)]";

  return (
    <form onSubmit={submit} className="border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand)]">
        Novo codigo — o colaborador entra na central so com ele
      </div>
      <div className="md:col-span-2">
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">Nome do colaborador *</label>
        <input required className={input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Joao Contador" />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">Comissao (%)</label>
        <input type="number" step="0.5" min="0" max="100" className={input} value={pct} onChange={(e) => setPct(e.target.value)} />
      </div>
      <div className="md:col-span-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-1.5">Observacoes</label>
        <input className={input} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
      </div>
      {error && <p className="md:col-span-3 text-[12px] text-red-700">{error}</p>}
      <div className="md:col-span-3 flex justify-end">
        <button
          type="submit"
          disabled={loading || !nome}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Gerar codigo
        </button>
      </div>
    </form>
  );
}

function CodigoCard({ data, onClose }: { data: { codigo: string; nome: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const texto = `Central do Parceiro NGT\nAcesse: https://nomosgt.com.br/parceiros/login\nSeu codigo: ${data.codigo}`;

  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border-2 border-[color:var(--color-brand)] bg-blue-50/50 p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-3">
        ✓ Codigo gerado para {data.nome}
      </div>
      <div className="font-mono text-4xl tracking-[0.2em] text-[color:var(--color-ink)] mb-4">
        {data.codigo}
      </div>
      <p className="text-[12px] text-[color:var(--color-ink-muted)] mb-4">
        Envie ao colaborador — ele acessa a central apenas com esse codigo.
      </p>
      <div className="flex gap-2">
        <button
          onClick={copiar}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[color:var(--color-brand)] text-white text-[12px] font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar mensagem completa"}
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
