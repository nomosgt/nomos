import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-emerald-100 text-emerald-800" },
  pausado: { label: "Pausado", color: "bg-amber-100 text-amber-800" },
  finalizado: { label: "Finalizado", color: "bg-gray-200 text-gray-700" },
  inadimplente: { label: "Inadimplente", color: "bg-red-100 text-red-700" },
};

export default async function AdminClientes() {
  const supabase = await createClient();
  const { data: clientes, error } = await supabase
    .from("client_profiles")
    .select("user_id, nome, empresa, cnpj, status, caixa_recuperado_total, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
            Clientes
          </h1>
          <p className="text-[14px] text-[color:var(--color-ink-muted)]">
            {clientes?.length || 0} cliente{(clientes?.length || 0) !== 1 ? "s" : ""} na Sala NGT.
          </p>
        </div>
        <Link
          href="/admin/clientes/novo"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] hover:-translate-y-0.5 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo cliente
        </Link>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-4 text-[13px] text-red-800">
          Erro: {error.message}
        </div>
      )}

      {clientes && clientes.length > 0 ? (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] text-left">
                <Th>Nome</Th>
                <Th>Empresa</Th>
                <Th>CNPJ</Th>
                <Th align="right">Recuperado</Th>
                <Th>Status</Th>
                <Th>Desde</Th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const s = STATUS_COLOR[c.status] || { label: c.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={c.user_id} className="border-b border-[color:var(--color-hairline)] last:border-0 hover:bg-[color:var(--color-surface)]">
                    <Td>
                      <Link href={`/admin/clientes/${c.user_id}`} className="font-medium hover:text-[color:var(--color-brand)]">
                        {c.nome}
                      </Link>
                    </Td>
                    <Td>{c.empresa || "—"}</Td>
                    <Td>
                      <span className="font-mono text-[12px] text-[color:var(--color-ink-muted)]">
                        {c.cnpj || "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-mono font-bold text-[color:var(--color-brand)]">
                        {formatBRL(Number(c.caixa_recuperado_total), { compact: true })}
                      </span>
                    </Td>
                    <Td>
                      <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${s.color}`}>
                        {s.label}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[11px] font-mono text-[color:var(--color-ink-faint)]">
                        {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-16 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhum cliente cadastrado ainda. Use “Novo cliente” pra criar o primeiro.
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] ${align === "right" ? "text-right" : ""}`}>{children}</th>;
}
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 align-middle ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
