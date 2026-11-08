import type { Metadata } from "next";
import { ColaboradoresPainel } from "@/components/admin/colaboradores-painel";
import { CentralColaboradores } from "@/components/admin/central-colaboradores";

export const metadata: Metadata = {
  title: "Colaboradores · Admin Arché",
};

export default function ColaboradoresPage() {
  return (
    <div className="space-y-12">
      <div>
        <div className="mb-6">
          <h1 className="font-serif text-2xl lg:text-3xl text-[color:var(--color-ink)]">
            Central de Comando · Colaboradores
          </h1>
          <p className="mt-1 text-[13px] text-[color:var(--color-ink-muted)]">
            Tarefas, deadlines, atrasos e desempenho operacional da equipe — dados reais, em um lugar só.
          </p>
        </div>
        <CentralColaboradores />
      </div>

      <div>
        <h2 className="font-serif text-xl text-[color:var(--color-ink)] mb-1">Acessos e credenciais</h2>
        <p className="mb-5 text-[13px] text-[color:var(--color-ink-muted)]">
          Códigos de acesso, percentuais e status cadastral.
        </p>
        <ColaboradoresPainel />
      </div>
    </div>
  );
}
