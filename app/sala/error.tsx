"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Error boundary da Sala Arché — captura qualquer erro de renderização
 * (SSR ou client) e mostra uma tela recuperável em vez de derrubar a página.
 */
export default function SalaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sala] erro capturado:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-200 mb-5">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <h1 className="font-serif text-2xl tracking-tight mb-2">
          Algo não carregou direito.
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)] leading-relaxed mb-6">
          Tivemos um tropeço ao abrir sua Sala. Isso costuma se resolver ao
          recarregar. Se continuar, a equipe Arché já pode te ajudar.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-brand)] text-white text-[13px] font-medium transition-all hover:-translate-y-0.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
          <Link
            href="/sala/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[color:var(--color-hairline)] text-[13px] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            Entrar de novo
          </Link>
        </div>
        <div className="mt-6">
          <Link
            href="https://wa.me/5511933333841"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-mono uppercase tracking-[0.25em] text-[color:var(--color-brand)] hover:underline"
          >
            Falar com a Arché
          </Link>
        </div>
        {error?.digest && (
          <div className="mt-4 font-mono text-[10px] text-[color:var(--color-ink-faint)]">
            ref: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}
