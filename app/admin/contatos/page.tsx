import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/status-badge";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "novo", label: "Novos" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "qualificado", label: "Qualificados" },
  { value: "fechado", label: "Fechados" },
  { value: "descartado", label: "Descartados" },
] as const;

export default async function ContatosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("contact_submissions")
    .select(
      "id, created_at, nome, email, telefone, empresa, cargo, status, origem, faturamento_estimado",
    )
    .order("created_at", { ascending: false });

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.q) {
    const term = `%${sp.q}%`;
    query = query.or(
      `nome.ilike.${term},email.ilike.${term},empresa.ilike.${term}`,
    );
  }

  const { data: rows, error } = await query.limit(200);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
            Contatos
          </h1>
          <p className="text-[14px] text-[color:var(--color-ink-muted)]">
            {rows?.length || 0} registro{(rows?.length || 0) !== 1 ? "s" : ""}
            {sp.q ? ` filtrando por “${sp.q}”` : ""}
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Buscar por nome, email, empresa…"
            className="px-3 py-2 text-[13px] bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] focus:outline-none focus:border-[color:var(--color-ink)]"
          />
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
        </form>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = (sp.status || "") === f.value;
          const url = new URLSearchParams();
          if (f.value) url.set("status", f.value);
          if (sp.q) url.set("q", sp.q);
          return (
            <Link
              key={f.value}
              href={`/admin/contatos?${url.toString()}`}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] transition-colors ${
                isActive
                  ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                  : "bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-ink)]"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-4 text-[13px] text-red-800">
          Erro carregando contatos: {error.message}
        </div>
      )}

      {/* Tabela */}
      {rows && rows.length > 0 ? (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] text-left">
                <Th>Data</Th>
                <Th>Nome</Th>
                <Th>Empresa</Th>
                <Th>Contato</Th>
                <Th>Origem</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[color:var(--color-hairline)] last:border-0 hover:bg-[color:var(--color-surface)]"
                >
                  <Td>
                    <Link href={`/admin/contatos/${c.id}`} className="block">
                      <div className="text-[12px] text-[color:var(--color-ink-muted)]">
                        {new Date(c.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/contatos/${c.id}`}
                      className="font-medium hover:text-[color:var(--color-brand)]"
                    >
                      {c.nome}
                    </Link>
                    {c.cargo && (
                      <div className="text-[11px] text-[color:var(--color-ink-faint)]">
                        {c.cargo}
                      </div>
                    )}
                  </Td>
                  <Td>{c.empresa || "—"}</Td>
                  <Td>
                    <div className="text-[12px]">{c.email}</div>
                    {c.telefone && (
                      <div className="text-[11px] text-[color:var(--color-ink-muted)]">
                        {c.telefone}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-muted)]">
                      {c.origem}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-16 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhum contato {sp.status ? "com esse status" : "ainda"}.
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
