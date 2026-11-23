import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatBRL } from "@/lib/utils";
import { PageHeader, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

const ETAPAS = ["—", "Reunião Preliminar", "NDA assinado", "Envios & Habilitação", "Análise Estratégica", "Apresentação Estratégica", "Contrato Assinado", "Em Execução"];

/** Admin · Projetos — visão consolidada de todos os casos (como no protótipo). */
export default async function ProjetosPage() {
  if (!isSupabaseConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_cases")
    .select("id, titulo, tese, status, etapa, potencial_estimado, valor_recuperado, data_estimada_conclusao, created_at, client_id, client_profiles ( nome, empresa )")
    .neq("status", "arquivado")
    .order("created_at", { ascending: false })
    .limit(300);

  const casos = (data ?? []).map((c) => ({
    ...c,
    cliente: (c.client_profiles as unknown as { nome: string; empresa: string | null } | null)?.empresa
      || (c.client_profiles as unknown as { nome: string } | null)?.nome || "—",
  }));

  return (
    <div>
      <PageHeader eyebrow="Gestão" title="Projetos em" em="andamento" sub={`${casos.length} caso(s) ativos na carteira`} />
      {error ? (
        <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-[13.5px] text-rose-800">
          Não foi possível carregar os projetos agora. Recarregue a página.
        </div>
      ) : casos.length === 0 ? (
        <div className="rounded-[10px] border border-[#e9e6df] bg-white p-10 text-center text-[13px] text-[#8a8ca3]">
          Nenhum caso ativo. Crie casos no painel de cada cliente.
        </div>
      ) : (
        <div className="space-y-2.5">
          {casos.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clientes/${c.client_id}`}
              className="block rounded-[10px] border border-[#e9e6df] bg-white px-5 py-4 transition-colors hover:border-[#0f1240]"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold text-[#0f1240]">{c.titulo}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                    {c.cliente} · {ETAPAS[c.etapa] || "—"}
                    {c.data_estimada_conclusao ? ` · previsão ${fmtData(c.data_estimada_conclusao)}` : ""}
                  </div>
                </div>
                {c.potencial_estimado != null && (
                  <div className="whitespace-nowrap font-serif text-[18px] text-[#0f1240]">
                    {formatBRL(Number(c.potencial_estimado), { compact: true })}
                  </div>
                )}
                {Number(c.valor_recuperado) > 0 && (
                  <div className="whitespace-nowrap text-[13px] font-semibold text-[#1d8a5a]">
                    {formatBRL(Number(c.valor_recuperado), { compact: true })}
                  </div>
                )}
                <StTag tone={c.status === "concluido" ? "ok" : c.status === "pausado" ? "warn" : "info"}>
                  {String(c.status).replace("_", " ")}
                </StTag>
              </div>
              {/* mini-barra de etapas (7) */}
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <div key={n} className={`h-1 flex-1 rounded-full ${n <= c.etapa ? "bg-[#0f1240]" : "bg-[#ebe8e1]"}`} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
