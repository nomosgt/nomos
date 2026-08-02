"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function ParceirosLoginPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/parceiros/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Falha na autenticacao.");
        return;
      }
      router.push("/parceiros");
      router.refresh();
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function maskCodigo(v: string): string {
    const clean = v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10);
    return clean;
  }

  return (
    <main className="min-h-screen bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex items-center justify-center px-4 grain relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] flex items-center justify-center">
        <svg className="w-[1000px] h-[1000px]" viewBox="0 0 1000 1000" fill="none" aria-hidden>
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <line
              key={deg}
              x1="500" y1="500"
              x2={500 + Math.cos((deg * Math.PI) / 180) * 500}
              y2={500 + Math.sin((deg * Math.PI) / 180) * 500}
              stroke="var(--color-paper)" strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="flex justify-center mb-10">
          <Logo variant="full" className="h-14 w-auto text-[color:var(--color-paper)]" />
        </div>

        <div className="bg-[color:var(--color-background)] text-[color:var(--color-ink)] p-8 lg:p-10">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand)] mb-4">
            <Lock className="w-3 h-3" />
            Portal de Parceiros
          </div>
          <h1 className="font-serif text-2xl lg:text-3xl leading-tight mb-2">
            Acesso exclusivo
            <br />
            <span className="italic text-[color:var(--color-brand)]">para parceiros NGT.</span>
          </h1>
          <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)] mb-8">
            Digite o seu código de colaborador para acompanhar projetos, prazos,
            trabalhos e comissões.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-faint)] block mb-2">
                Código de colaborador *
              </label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(maskCodigo(e.target.value))}
                placeholder="NGT-XXXXXX"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={loading}
                className="w-full bg-transparent border-b-2 border-[color:var(--color-ink)] pb-3 text-2xl font-mono tracking-[0.15em] text-center text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-faint)] focus:outline-none focus:border-[color:var(--color-brand)]"
              />
            </div>

            {error && <p className="text-[12px] text-red-700 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || codigo.length < 6}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[13px] font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando…
                </>
              ) : (
                <>
                  Entrar no portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-[color:var(--color-ink-faint)] leading-relaxed text-center">
            Não possui código? Fale com a equipe NGT:{" "}
            <a href="mailto:contato@nomosgt.com.br" className="underline hover:text-[color:var(--color-brand)]">
              contato@nomosgt.com.br
            </a>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/acesso"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/50 hover:text-[color:var(--color-paper)] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar para acessos
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
