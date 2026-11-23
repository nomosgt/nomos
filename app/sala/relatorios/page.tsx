import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileText, Download, Eye } from "lucide-react";
import { PageHeader, Cd, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

/** Sala · Relatórios — documentos publicados pela Arché na categoria relatório. */
export default async function SalaRelatoriosPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/sala/login");

  const { data: docs } = await supabase
    .from("case_documents")
    .select("id, created_at, nome, storage_path, categoria, client_cases!inner(client_id, titulo)")
    .eq("client_cases.client_id", u.user.id)
    .eq("visibilidade", "cliente")
    .eq("arquivado", false)
    .in("categoria", ["relatorio", "parecer"])
    .order("created_at", { ascending: false });

  const lista = docs ?? [];

  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Relatórios sob" em="demanda" sub="Relatórios e pareceres publicados pela equipe para a sua empresa." />
      <Cd title="Publicações" mono={`${lista.length}`}>
        {lista.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">
            Nenhum relatório publicado ainda. Os demais arquivos do seu caso ficam em Documentos.
          </p>
        ) : (
          <div className="space-y-2.5">
            {lista.map((d) => {
              const caso = d.client_cases as unknown as { titulo: string } | null;
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#efece6] px-4 py-3.5">
                  <FileText size={16} className="flex-none text-[#3a40c9]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-[#0f1240]">{d.nome}</div>
                    <div className="font-mono text-[11px] text-[#8a8ca3]">
                      {d.categoria} · {caso?.titulo || "—"} · {fmtData(d.created_at)}
                    </div>
                  </div>
                  <a
                    className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[#dedbd3] bg-white px-3 text-[12px] font-semibold text-[#14173d] hover:border-[#0f1240]"
                    href={`/api/sala/documentos/baixar?path=${encodeURIComponent(d.storage_path)}&modo=ver`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Eye size={13} /> Ver
                  </a>
                  <a
                    className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#0f1240] px-3 text-[12px] font-semibold text-white hover:bg-[#3a40c9]"
                    href={`/api/sala/documentos/baixar?path=${encodeURIComponent(d.storage_path)}&modo=baixar`}
                  >
                    <Download size={13} /> Baixar
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </Cd>
    </div>
  );
}
