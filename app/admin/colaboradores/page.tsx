import type { Metadata } from "next";
import { ColaboradoresPainel } from "@/components/admin/colaboradores-painel";

export const metadata: Metadata = {
  title: "Colaboradores · Admin NGT",
};

export default function ColaboradoresPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)]">
          Colaboradores
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-muted)]">
          Parceiros com acesso ao Portal — percentuais, status e credenciais.
        </p>
      </div>
      <ColaboradoresPainel />
    </div>
  );
}
