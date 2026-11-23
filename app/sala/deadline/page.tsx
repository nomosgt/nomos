import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Cd, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

const ETAPAS = ["—", "Reunião Preliminar", "NDA assinado", "Envios & Habilitação", "Análise Estratégica", "Apresentação Estratégica", "Contrato Assinado", "Em Execução"];

/**
 * Sala · Deadline — o que depende de você e o que está previsto:
 * aprovações pendentes, horas aguardando decisão, reuniões confirmadas
 * e previsões de conclusão dos projetos. Tudo real, nada inventado.
 */
export default async function SalaDeadlinePage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/sala/login");
  const uid = u.user.id;

  const [cases, aprovs, horas, reunioes] = await Promise.all([
    supabase.from("client_cases").select("*").eq("client_id", uid).neq("status", "arquivado"),
    supabase.from("client_aprovacoes").select("id, titulo, created_at").eq("client_id", uid).eq("status", "pendente").order("created_at"),
    supabase.from("horas_estimativas").select("id, titulo, criado_em").eq("client_id", uid).eq("status", "aguardando_aprovacao").order("criado_em"),
    supabase.from("reunioes").select("id, titulo, data_confirmada").eq("client_id", uid).eq("status", "confirmada").order("data_confirmada"),
  ]);

  const pendencias = [
    ...(aprovs.data ?? []).map((a) => ({ id: a.id, titulo: a.titulo, tipo: "Aprovação", href: "/sala/aprovacoes", desde: a.created_at })),
    ...(horas.data ?? []).map((h) => ({ id: h.id, titulo: h.titulo, tipo: "Horas técnicas", href: "/sala/horas", desde: h.criado_em })),
  ];
  const confirmadas = (reunioes.data ?? []).filter((r) => r.data_confirmada);
  const previsoes = (cases.data ?? [])
    .filter((c) => (c as { visivel_cliente?: boolean }).visivel_cliente !== false)
    .filter((c) => c.data_estimada_conclusao)
    .sort((a, b) => String(a.data_estimada_conclusao).localeCompare(String(b.data_estimada_conclusao)));

  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Deadline dos" em="projetos" sub="O que depende de você, agenda confirmada e previsões de conclusão." />
      <div className="space-y-5">
        <Cd title="Aguardando sua decisão" mono={`${pendencias.length}`}>
          {pendencias.length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Nada pendente com você. 👏</p>
          ) : (
            <div className="space-y-2.5">
              {pendencias.map((p) => (
                <Link key={p.tipo + p.id} href={p.href} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-amber-200 bg-amber-50/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#0f1240]">{p.titulo}</div>
                    <div className="font-mono text-[11px] text-[#8a8ca3]">desde {fmtData(p.desde)}</div>
                  </div>
                  <StTag tone="warn">{p.tipo}</StTag>
                </Link>
              ))}
            </div>
          )}
        </Cd>

        <Cd title="Reuniões confirmadas" mono={`${confirmadas.length}`}>
          {confirmadas.length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">
              Nenhuma reunião confirmada. <Link href="/sala/reunioes" className="font-semibold text-[#3a40c9] hover:underline">Solicitar →</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {confirmadas.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-[13.5px] text-[#14173d]">
                  <span className="font-mono text-[12px] font-semibold text-[#0f1240]">{fmtData(r.data_confirmada, true)}</span>
                  <span className="truncate">{r.titulo}</span>
                </div>
              ))}
            </div>
          )}
        </Cd>

        <Cd title="Previsões de conclusão" mono={`${previsoes.length} projeto(s)`}>
          {previsoes.length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Sem previsões registradas pela equipe ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {previsoes.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[12px] font-semibold text-[#0f1240]">{fmtData(c.data_estimada_conclusao)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#14173d]">{c.titulo}</span>
                  <span className="font-mono text-[11px] text-[#8a8ca3]">{ETAPAS[c.etapa] || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </Cd>
      </div>
    </div>
  );
}
