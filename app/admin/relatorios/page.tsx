import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relatórios · Admin Arché",
};

export const dynamic = "force-dynamic";

/**
 * Gerador de Relatórios — sistema do Éverton para montar relatórios de
 * diagnóstico (oportunidades, passivos, investimento e PDF timbrado).
 * Servido via iframe autenticado; sincroniza automaticamente com o Supabase.
 */
export default function AdminRelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Gerador de Relatórios
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Monte o relatório de diagnóstico do cliente — oportunidades, passivos,
          investimento e exportação em PDF timbrado. Os relatórios salvos ficam
          na nuvem e podem ser abertos por qualquer admin, em qualquer computador.
        </p>
      </div>
      <iframe
        src="/api/admin/relatorios"
        title="Gerador de Relatórios Arché"
        className="w-full border border-[color:var(--color-hairline)] bg-white"
        style={{ height: "calc(100vh - 220px)", minHeight: 640 }}
      />
    </div>
  );
}
