"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Check, Copy } from "lucide-react";

interface InvitedInfo {
  user_id: string;
  email: string;
  temp_password: string;
}

export function NovoClienteForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<InvitedInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());

    startTransition(async () => {
      const res = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Erro ao criar cliente.");
        return;
      }
      setInvited(json);
    });
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (invited) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]">
          <ArrowLeft className="w-3 h-3" /> Clientes
        </Link>
        <div className="border-2 border-emerald-300 bg-emerald-50 p-8">
          <div className="flex items-center gap-2 text-emerald-800 font-mono text-[11px] uppercase tracking-[0.25em] mb-4">
            <Check className="w-4 h-4" /> Cliente criado com sucesso
          </div>
          <h1 className="font-serif text-2xl lg:text-3xl tracking-tight text-emerald-900 mb-4">
            Compartilhe estas credenciais com o cliente
          </h1>
          <p className="text-[14px] text-emerald-900/85 mb-6 leading-relaxed">
            Envie por WhatsApp ou email. Recomende que o cliente troque a senha
            no primeiro login (Em breve: link mágico via Supabase Auth).
          </p>

          <CredField label="URL de acesso" value={`${process.env.NEXT_PUBLIC_SITE_URL || "https://nomos.gt"}/sala/login`} onCopy={copy} copyKey="url" copied={copied === "url"} />
          <CredField label="E-mail" value={invited.email} onCopy={copy} copyKey="email" copied={copied === "email"} />
          <CredField label="Senha temporária" value={invited.temp_password} onCopy={copy} copyKey="pwd" copied={copied === "pwd"} mono />
        </div>
        <Link href="/admin/clientes" className="inline-flex items-center gap-2 px-5 py-3 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em]">
          Voltar pra lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]">
        <ArrowLeft className="w-3 h-3" /> Clientes
      </Link>
      <h1 className="font-serif text-3xl lg:text-4xl tracking-tight">Novo cliente</h1>
      <p className="text-[14px] text-[color:var(--color-ink-muted)] max-w-lg">
        Preencha os dados. O sistema gera uma senha temporária. Você envia por
        WhatsApp/email e o cliente acessa a Sala NGT.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome completo *" name="nome" required />
        <Field label="E-mail *" name="email" type="email" required placeholder="cfo@empresa.com" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Empresa" name="empresa" />
          <Field label="CNPJ" name="cnpj" placeholder="00.000.000/0000-00" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Cargo" name="cargo" placeholder="CFO, Controller…" />
          <Field label="Telefone" name="telefone" type="tel" />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 border border-red-300 bg-red-50 text-[13px] text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium hover:-translate-y-0.5 transition-transform disabled:opacity-60"
        >
          {pending ? "Criando…" : "Criar cliente e gerar credencial"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, type = "text", required, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] focus:border-[color:var(--color-ink)] p-3 text-[14px] focus:outline-none"
      />
    </div>
  );
}

function CredField({ label, value, onCopy, copyKey, copied, mono }: { label: string; value: string; onCopy: (v: string, k: string) => void; copyKey: string; copied: boolean; mono?: boolean }) {
  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-700 mb-1.5">
        {label}
      </div>
      <div className="flex items-center gap-2 bg-white border border-emerald-200 p-3">
        <span className={`flex-1 break-all ${mono ? "font-mono text-[15px]" : "text-[14px]"} text-emerald-950`}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onCopy(value, copyKey)}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-700 hover:bg-emerald-100"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Ok" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
