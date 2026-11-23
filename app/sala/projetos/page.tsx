import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { PageHeader, Cd, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

const ETAPAS = ["—", "Reunião Preliminar", "NDA assinado", "Envios & Habilitação", "Análise Estratégica", "Apresentação Estratégica", "Contrato Assinado", "Em Execução"];

/** Sala · Meus projetos — todos os casos do cliente com etapa, valores e últimos eventos. */
export default async function SalaProjetosPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/sala/login");

  const [cases, updates] = await Promise.all([
    supabase.from("client_cases").select("*").eq("client_id", u.user.id).neq("status", "arquivado").order("created_at", { ascending: false }),
    supabase
      .from("case_updates")
      .select("id, created_at, titulo, tipo, case_id, client_cases!inner(client_id)")
      .eq("client_cases.client_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  // v27: respeita o "visível ao cliente" marcado pelo admin (tolerante pré-v27)
  const casos = (cases.data ?? []).filter((c) => (c as { visivel_cliente?: boolean }).visivel_cliente !== false);
  const eventosPorCaso = new Map<string, { id: string; created_at: string; titulo: string; tipo: string }[]>();
  for (const e of updates.data ?? []) {
    const arr = eventosPorCaso.get(e.case_id as string) || [];
    if (arr.length < 3) arr.push(e as never);
    eventosPorCaso.set(e.case_id as string, arr);
  }

  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Projetos em" em="andamento" sub={`${casos.length} projeto(s) acompanhado(s) pela Arché`} />
      {casos.length === 0 ? (
        <div className="rounded-[10px] border border-[#e9e6df] bg-white p-10 text-center text-[13px] text-[#8a8ca3]">
          Nenhum projeto ativo no momento.
        </div>
      ) : (
        <div className="space-y-5">
          {casos.map((c) => (
            <Cd key={c.id} title={c.titulo} mono={c.tese || undefined}>
              <div className="flex flex-wrap items-center gap-3">
                <StTag tone={c.status === "concluido" ? "ok" : c.status === "pausado" ? "warn" : "info"}>
                  {String(c.status).replace("_", " ")}
                </StTag>
                <span className="font-mono text-[11px] text-[#8a8ca3]">
                  Etapa {c.etapa} de 7 · {ETAPAS[c.etapa] || "—"}
                  {c.data_estimada_conclusao ? ` · previsão ${fmtData(c.data_estimada_conclusao)}` : ""}
                </span>
              </div>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= c.etapa ? "bg-[#0f1240]" : "bg-[#ebe8e1]"}`} />
                ))}
              </div>

              {(c.potencial_estimado != null || Number(c.valor_recuperado) > 0) && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {c.potencial_estimado != null && (
                    <div className="rounded-[10px] border border-[#efece6] px-4 py-3">
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7a7c95]">Potencial estimado</div>
                      <div className="mt-1 font-serif text-[22px] text-[#0f1240]">{formatBRL(Number(c.potencial_estimado), { compact: true })}</div>
                    </div>
                  )}
                  <div className="rounded-[10px] border border-[#efece6] px-4 py-3">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7a7c95]">Recuperado neste projeto</div>
                    <div className="mt-1 font-serif text-[22px] text-[#1d8a5a]">{formatBRL(Number(c.valor_recuperado || 0), { compact: true })}</div>
                  </div>
                </div>
              )}

              {c.proxima_acao && (
                <div className="mt-4 border-l-2 border-[#3a40c9] bg-[#f4f2ee] px-4 py-3">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#3a40c9]">Próxima ação</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[#14173d]">{c.proxima_acao}</p>
                </div>
              )}

              {(eventosPorCaso.get(c.id) || []).length > 0 && (
                <div className="mt-4 border-t border-[#f1eee8] pt-3">
                  <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#7a7c95]">Linha do tempo recente</div>
                  <div className="space-y-1.5">
                    {(eventosPorCaso.get(c.id) || []).map((e) => (
                      <div key={e.id} className="flex items-center gap-3 text-[13px] text-[#14173d]">
                        <span className="font-mono text-[10.5px] text-[#8a8ca3]">{fmtData(e.created_at)}</span>
                        <span className="truncate">{e.titulo}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/sala/atualizacoes" className="mt-2 inline-block text-[12px] font-semibold text-[#3a40c9] hover:underline">
                    Ver linha do tempo completa →
                  </Link>
                </div>
              )}
            </Cd>
          ))}
        </div>
      )}
    </div>
  );
}
