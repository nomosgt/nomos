import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { PageHeader, Cd, Kc, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

const ESTAGIO_LABEL: Record<string, string> = {
  potencial: "Potencial", apurado: "Apurado", compensacao: "Em compensação",
  recuperado: "Recuperado", honorarios: "Honorários", ajuste: "Ajuste",
};

/**
 * Sala · Financeiro — números consolidados do cliente + extrato do livro
 * (lançamentos reais do case_financeiro, somente leitura). Estágios nunca
 * são somados entre si — são fases do mesmo crédito.
 */
export default async function SalaFinanceiroPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/sala/login");
  const uid = u.user.id;

  const [dash, cases, ledger] = await Promise.all([
    supabase.from("client_dashboard").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("client_cases").select("*").eq("client_id", uid).neq("status", "arquivado"),
    supabase
      .from("case_financeiro")
      .select("id, created_at, tipo, valor, descricao, case_titulo")
      .eq("client_id", uid)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const casosVisiveis = (cases.data ?? []).filter((c) => (c as { visivel_cliente?: boolean }).visivel_cliente !== false);
  const potencialTotal = casosVisiveis.reduce((a, c) => a + (c.potencial_estimado ? Number(c.potencial_estimado) : 0), 0);
  const recuperadoTotal = dash.data?.caixa_recuperado_total ? Number(dash.data.caixa_recuperado_total) : 0;
  const lanc = ledger.data ?? [];

  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Seu histórico" em="financeiro" sub="Números consolidados e extrato dos lançamentos — mesma fonte usada pela equipe Arché." />

      <div className="mb-5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <Kc dark label="Recuperado · acumulado" value={formatBRL(recuperadoTotal, { compact: true })} sub="dinheiro de volta no seu caixa" />
        <Kc label="Potencial identificado" value={formatBRL(potencialTotal, { compact: true })} sub="estimativa dos projetos ativos" />
        <Kc label="Projetos ativos" value={String(cases.data?.length ?? 0)} sub="acompanhados pela Arché" />
      </div>

      <Cd title="Extrato do livro" mono={`${lanc.length} lançamento(s)`}>
        {ledger.error ? (
          <p className="text-[13px] text-[#8a8ca3]">Extrato indisponível no momento.</p>
        ) : lanc.length === 0 ? (
          <p className="text-[13px] text-[#8a8ca3]">Nenhum lançamento registrado ainda. Cada movimento aparece aqui com data e projeto.</p>
        ) : (
          <div className="space-y-2">
            {lanc.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 border-b border-[#f1eee8] pb-2 last:border-0">
                <span className="font-mono text-[11px] text-[#8a8ca3]">{fmtData(l.created_at)}</span>
                <StTag tone={l.tipo === "recuperado" ? "ok" : l.tipo === "ajuste" ? "warn" : "info"}>
                  {ESTAGIO_LABEL[l.tipo] || l.tipo}
                </StTag>
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#14173d]">
                  {l.descricao || l.case_titulo || "Lançamento"}
                </span>
                <span className={`font-mono text-[13.5px] font-semibold ${Number(l.valor) < 0 ? "text-rose-700" : "text-[#0f1240]"}`}>
                  {formatBRL(Number(l.valor))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Cd>

      <p className="mt-4 text-[12px] leading-relaxed text-[#8a8ca3]">
        Potencial, apurado, compensação e recuperado são fases do mesmo crédito — nunca se somam entre si.
        Dúvidas sobre algum lançamento? Fale com a equipe em <a className="underline" href="mailto:contato@archebrasil.com.br">contato@archebrasil.com.br</a>.
      </p>
    </div>
  );
}
