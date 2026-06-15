import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj } from "@/lib/validation/cnpj";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

const APLICAB_COLOR: Record<string, string> = {
  alta: "bg-emerald-100 text-emerald-800",
  media: "bg-amber-100 text-amber-800",
  baixa: "bg-gray-200 text-gray-700",
};

const PERFIL_LABEL: Record<string, string> = {
  lucro_real: "Lucro Real",
  lucro_presumido: "Lucro Presumido",
  simples: "Simples Nacional",
  inconclusivo: "Inconclusivo",
};

interface AnaliseShape {
  perfil_tributario?: string;
  justificativa_perfil?: string;
  oportunidades?: Array<{ nome: string; aplicabilidade: string; justificativa: string }>;
  riscos?: Array<{ ponto: string; descricao: string }>;
  proxima_acao?: string;
}

export default async function ConsultaDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cnpj_lookups")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const analise: AnaliseShape | null = data.analise || null;

  return (
    <div className="space-y-8 max-w-4xl">
      <Link
        href="/admin/cnpj"
        className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
      >
        <ArrowLeft className="w-3 h-3" />
        Todas as consultas
      </Link>

      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-2">
          {formatCnpj(data.cnpj)}
        </div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          {data.razao_social || "Razão social não disponível"}
        </h1>
        {data.nome_fantasia && (
          <div className="text-[14px] text-[color:var(--color-ink-muted)]">
            {data.nome_fantasia}
          </div>
        )}
        <div className="mt-4 text-[12px] font-mono text-[color:var(--color-ink-faint)]">
          Consultado em {new Date(data.created_at).toLocaleString("pt-BR")}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Box label="CNAE" value={[data.cnae_principal, data.cnae_descricao].filter(Boolean).join(" · ") || "—"} />
        <Box label="Porte" value={data.porte || "—"} />
        <Box label="Situação" value={data.situacao_cadastral || "—"} />
        <Box label="Capital Social" value={data.capital_social ? formatBRL(Number(data.capital_social)) : "—"} mono />
        <Box label="Município/UF" value={[data.municipio, data.uf].filter(Boolean).join(" · ") || "—"} />
        <Box
          label="Perfil sugerido"
          value={
            data.perfil_tributario_sugerido
              ? PERFIL_LABEL[data.perfil_tributario_sugerido] || data.perfil_tributario_sugerido
              : "—"
          }
        />
      </div>

      {analise ? (
        <>
          <Card title="Justificativa do perfil tributário">
            <p className="text-[15px] leading-relaxed text-[color:var(--color-ink)]">
              {analise.justificativa_perfil}
            </p>
          </Card>

          {analise.oportunidades && analise.oportunidades.length > 0 && (
            <Card title="Teses aplicáveis">
              <div className="space-y-3">
                {analise.oportunidades.map((o, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-start p-4 border border-[color:var(--color-hairline)] bg-[color:var(--color-background)]"
                  >
                    <div>
                      <div className="font-serif text-base text-[color:var(--color-ink)] mb-1.5">
                        {o.nome}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${APLICAB_COLOR[o.aplicabilidade] || ""}`}
                      >
                        {o.aplicabilidade}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-[color:var(--color-ink-muted)]">
                      {o.justificativa}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {analise.riscos && analise.riscos.length > 0 && (
            <Card title="Pontos de atenção">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analise.riscos.map((r, i) => (
                  <div
                    key={i}
                    className="p-4 border border-amber-200 bg-amber-50"
                  >
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-800 mb-1.5">
                      {r.ponto}
                    </div>
                    <p className="text-[13px] leading-relaxed text-amber-900">
                      {r.descricao}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {analise.proxima_acao && (
            <Card title="Próxima ação sugerida pela IA">
              <p className="font-serif text-xl lg:text-2xl leading-[1.35] text-[color:var(--color-ink)]">
                {analise.proxima_acao}
              </p>
            </Card>
          )}
        </>
      ) : (
        <div className="border border-amber-200 bg-amber-50 p-6 text-[14px] text-amber-900">
          Análise IA não disponível para essa consulta (sem ANTHROPIC_API_KEY na hora ou erro na API).
        </div>
      )}

      {data.contact_submission_id && (
        <div className="border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-2">
            Lead vinculado
          </div>
          <Link
            href={`/admin/contatos/${data.contact_submission_id}`}
            className="text-[14px] hover:underline"
          >
            Ver contato relacionado →
          </Link>
        </div>
      )}
    </div>
  );
}

function Box({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5">
        {label}
      </div>
      <div className={`${mono ? "font-mono" : ""} text-[13px] text-[color:var(--color-ink)]`}>
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
