import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Entrar · Admin NGT",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-ink)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-[color:var(--color-paper)]/50 mb-4">
            NGT · Admin
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight text-[color:var(--color-paper)]">
            Acesso restrito
          </h1>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
