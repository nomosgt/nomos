import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SimulacoesPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("simulator_runs")
    .select(
      "id, created_at, faturamento, despesa_indireta, setor, regime, tese_judicial, tese_administrativa, icms_comercio, total, contact_submission_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Simulações
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          {rows?.length || 0} simulação{(rows?.length || 0) !== 1 ? "ões" : ""} registrada
          {(rows?.length || 0) !== 1 ? "s" : ""}.
        </p>
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
                <Th>Setor / Regime</Th>
                <Th align="right">Faturamento</Th>
                <Th align="right">Despesa Ind.</Th>
                <Th align="right">Judicial</Th>
                <Th align="right">Administrativa</Th>
                <Th align="right">Total</Th>
                <Th>Lead</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[color:var(--color-hairline)] last:border-0 hover:bg-[color:var(--color-surface)]"
                >
                  <Td>
                    <Link
                      href={`/admin/simulacoes/${r.id}`}
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
                      href={`/admin/simulacoes/${r.id}`}
                      className="hover:text-[color:var(--color-brand)]"
                    >
                      <div className="capitalize font-medium">{r.setor}</div>
                      <div className="text-[11px] text-[color:var(--color-ink-muted)]">
                        {r.regime === "real" ? "Lucro Real" : "Lucro Presumido"}
                      </div>
                    </Link>
                  </Td>
                  <Td align="right">
                    <span className="font-mono">{formatBRL(Number(r.faturamento), { compact: true })}</span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[color:var(--color-ink-muted)]">
                      {formatBRL(Number(r.despesa_indireta), { compact: true })}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[color:var(--color-ink-muted)]">
                      {formatBRL(Number(r.tese_judicial), { compact: true })}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[color:var(--color-ink-muted)]">
                      {formatBRL(Number(r.tese_administrativa), { compact: true })}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="font-mono font-bold text-[color:var(--color-brand)]">
                      {formatBRL(Number(r.total), { compact: true })}
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-16 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhuma simulação registrada ainda.
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td className={`px-4 py-3 align-top ${align === "right" ? "text-right" : ""}`}>
      {children}
    </td>
  );
}
