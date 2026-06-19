"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, MessageCircle } from "lucide-react";

export function SalaLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/sala";
  const initialError = search.get("erro");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "sem_permissao"
      ? "Esta conta não tem acesso à Sala NGT."
      : null,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/50 mb-2 block">
          E-mail
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[color:var(--color-paper)]/5 border border-[color:var(--color-paper)]/15 px-4 py-3 text-[14px] text-[color:var(--color-paper)] placeholder:text-[color:var(--color-paper)]/30 focus:outline-none focus:border-[color:var(--color-brand-soft)]"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/50 mb-2 block">
          Senha
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[color:var(--color-paper)]/5 border border-[color:var(--color-paper)]/15 px-4 py-3 text-[14px] text-[color:var(--color-paper)] focus:outline-none focus:border-[color:var(--color-brand-soft)]"
        />
      </div>
      {error && (
        <div className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/10 border border-red-500/20 p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[color:var(--color-brand-soft)] text-[color:var(--color-ink)] font-medium text-[13px] py-3.5 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
      >
        {loading ? "Entrando…" : "Entrar na Sala"}
      </button>

      <div className="pt-6 border-t border-[color:var(--color-paper)]/10 text-center space-y-3">
        <p className="text-[12px] text-[color:var(--color-paper)]/50">
          Ainda não tem acesso? Fale com o time NGT.
        </p>
        <Link
          href="https://wa.me/5519995619838"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-brand-soft)] hover:text-[color:var(--color-paper)]"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Falar com a NGT
        </Link>
      </div>
    </form>
  );
}
// end of SalaLoginForm
