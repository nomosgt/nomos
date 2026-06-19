import type { Metadata } from "next";
import { Suspense } from "react";
import { SalaLoginForm } from "@/components/sala/sala-login-form";

export const metadata: Metadata = {
  title: "Sala NGT · Entrar",
  robots: { index: false, follow: false },
};

export default function SalaLoginPage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-brand-soft)] mb-4">
            ◇ Sala NGT · Cliente
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight">
            Entre na sua Sala
          </h1>
          <p className="mt-4 text-[13px] text-[color:var(--color-paper)]/55">
            Acesse seu painel exclusivo de acompanhamento.
          </p>
        </div>
        <Suspense>
          <SalaLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
