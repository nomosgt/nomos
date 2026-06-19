import { createClient } from "@/lib/supabase/server";
import { FileText, Download } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function Documentos() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user!.id;

  const { data: docs } = await supabase
    .from("case_documents")
    .select(
      "id, created_at, nome, storage_path, tipo_mime, tamanho_bytes, categoria, case_id, client_cases!inner(client_id, titulo)",
    )
    .eq("client_cases.client_id", userId)
    .eq("visibilidade", "cliente")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Documentos
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Contratos, relatórios e despachos do seu caso.
        </p>
      </div>

      {docs && docs.length > 0 ? (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] text-left">
                <Th>Documento</Th>
                <Th>Categoria</Th>
                <Th>Caso</Th>
                <Th>Data</Th>
                <Th>Tamanho</Th>
                <Th>Baixar</Th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const caso = d.client_cases as unknown as { titulo: string } | null;
                return (
                  <tr
                    key={d.id}
                    className="border-b border-[color:var(--color-hairline)] last:border-0 hover:bg-[color:var(--color-surface)]"
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[color:var(--color-ink-muted)] flex-shrink-0" />
                        <span className="font-medium">{d.nome}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-[color:var(--color-ink-muted)] capitalize">
                        {d.categoria || "geral"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-[color:var(--color-ink-muted)]">
                        {caso?.titulo || "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                        {new Date(d.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                        {fmtBytes(d.tamanho_bytes)}
                      </span>
                    </Td>
                    <Td>
                      <form action="/api/sala/documentos/baixar" method="POST">
                        <input type="hidden" name="path" value={d.storage_path} />
                        <input type="hidden" name="nome" value={d.nome} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand)] hover:underline"
                        >
                          <Download className="w-3 h-3" />
                          Baixar
                        </button>
                      </form>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-16 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhum documento disponível ainda. A equipe NGT vai publicar aqui
          conforme novos arquivos forem gerados.
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
