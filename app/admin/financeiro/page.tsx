import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financeiro · Admin Arché",
};

export const dynamic = "force-dynamic";

/**
 * Livro-Caixa — sistema financeiro completo (receitas, retenções de
 * parceiros, comissionamentos em cascata, custos e relatórios).
 * Servido via iframe autenticado; sincroniza automaticamente com o Supabase.
 */
export default function AdminFinanceiroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Financeiro · Livro-Caixa
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Receitas, retenções de parceiros, comissionamentos e relatórios —
          com backup automático na nuvem. Para definir o que cada colaborador
          vê na Central (%, pendências, próximo pagamento), use a aba{" "}
          <a href="/admin/parceiros" className="underline text-[color:var(--color-brand)]">Parceiros</a>.
        </p>
      </div>
      <iframe
        src="/api/admin/livro-caixa"
        title="Livro-Caixa Arché"
        className="w-full border border-[color:var(--color-hairline)] bg-white"
        style={{ height: "calc(100vh - 220px)", minHeight: 600 }}
      />
    </div>
  );
}
