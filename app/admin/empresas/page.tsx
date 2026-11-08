import type { Metadata } from "next";
import { EmpresasPainel } from "@/components/admin/empresas-painel";

export const metadata: Metadata = {
  title: "Empresas · Admin Arché",
};

export default function EmpresasPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)]">
          Inteligência Empresarial
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-muted)]">
          Todas as empresas atendidas — faturamento informado, casos, análises e prazos. Dados reais, separados da recuperação tributária.
        </p>
      </div>
      <EmpresasPainel />
    </div>
  );
}
