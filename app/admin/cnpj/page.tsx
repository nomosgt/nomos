import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj } from "@/lib/validation/cnpj";

export const dynamic = "force-dynamic";

const PERFIL_LABEL: Record<string, { label: string; color: string }> = {
  lucro_real: { label: "Lucro Real", color: "bg-emerald-100 text-emerald-800" },
  lucro_presumido: { label: "Lucro Presumido", color: "bg-amber-100 text-amber-800" },
  simples: { label: "Simples", color: "bg-blue-100 text-blue-800" },
  inconclusivo: { label: "Inconclusivo", color: "bg-gray-200 text-gray-700" },
};

export default async function AdminCnpj({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; uf?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("cnpj_lookups")
    .select(
      "id, created_at, cnpj, razao_social, nome_fantasia, cnae_descricao, porte, municipio, uf, perfil_tributario_sugerido, contact_submission_id",
    )
    .order("created_at", { ascending: false });

  if (sp.q) {
    const term = `%${sp.q}%`;
    query = query.or(
      `cnpj.ilike.${term},razao_social.ilike.${term},nome_fantasia.ilike.${term}`,
    );
  }
  if (sp.uf) query = query.eq("uf", sp.uf);

  const { data: rows, error } = await query.limit(200);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
            Consultas CNPJ
          </h1>
          <p className="text-[14px] text-[color:var(--color-ink-muted)]">
            {rows?.length || 0} consulta{(rows?.length || 0) !== 1 ? "s" : ""} registrada
            {(rows?.length || 0) !== 1 ? "s" : ""} via /cnpj
            {sp.q ? ` · filtrando “${sp.q}”` : ""}
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={sp.q || ""}
            placeholder="CNPJ, razão social, fantasia…"
            className="px-3 py-2 text-[13px] bg-[color:var(--color-paper)] border border-[color:var(--color-hairline)] focus:outline-none focus:border-[color:var(--color-ink)]"
          />
        </form>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-4 text-[13px] text-red-800">
          Erro: {error.message}
        </div>
      )}

      {rows && rows.length > 0 ? (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] text-left">
                <Th>Data</Th>
                <Th>CNPJ</Th>
                <Th>Empresa</Th>
                <Th>Atividade</Th>
                <Th>Local</Th>
                <Th>Perfil sugerido</Th>
                <Th>Lead</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = r.perfil_tributario_sugerido
                  ? PERFIL_LABEL[r.perfil_tributario_sugerido]
                  : null;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[color:var(--color-hairline)] last:border-0 hover:bg-[color:var(--color-surface)]"
                  >
                    <Td>
                      <Link
                        href={`/admin/cnpj/${r.id}`}
                        className="text-[12px] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-brand)]"
                      >
                        {new Date(r.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/cnpj/${r.id}`}
                        className="font-mono text-[12px] hover:text-[color:var(--color-brand)]"
                      >
                        {formatCnpj(r.cnpj)}
                      </Link>
                    </Td>
                    <Td>
                      <div className="font-medium">
                        {r.razao_social || "—"}
                      </div>
                      {r.nome_fantasia && (
                        <div className="text-[11px] text-[color:var(--color-ink-faint)]">
                          {r.nome_fantasia}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <span className="text-[12px] text-[color:var(--color-ink-muted)] line-clamp-2 max-w-[200px]">
                        {r.cnae_descricao || "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[12px]">
                        {[r.municipio, r.uf].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </Td>
                    <Td>
                      {p ? (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${p.color}`}
                        >
                          {p.label}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[color:var(--color-ink-faint)]">
                          —
                        </span>
                      )}
                    </Td>
                    <Td>
                      {r.contact_submission_id ? (
                        <Link
                          href={`/admin/contatos/${r.contact_submission_id}`}
                          className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-brand)] hover:underline"
                        >
                          Convertido →
                        </Link>
                      ) : (
                        <span className="text-[11px] text-[color:var(--color-ink-faint)]">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-16 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhuma consulta de CNPJ ainda.
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
