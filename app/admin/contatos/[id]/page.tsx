import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusUpdater } from "@/components/admin/status-updater";
import { NotasInternas } from "@/components/admin/notas-internas";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContatoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contato, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !contato) notFound();

  // Se foi convertido de simulação, busca também
  let simulacao = null;
  if (contato.simulator_run_id) {
    const { data } = await supabase
      .from("simulator_runs")
      .select("*")
      .eq("id", contato.simulator_run_id)
      .maybeSingle();
    simulacao = data;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <Link
        href="/admin/contatos"
        className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
      >
        <ArrowLeft className="w-3 h-3" />
        Todos os contatos
      </Link>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-3xl lg:text-4xl tracking-tight">
              {contato.nome}
            </h1>
            <StatusBadge status={contato.status} />
          </div>
          <p className="text-[13px] text-[color:var(--color-ink-muted)]">
            {contato.cargo ? `${contato.cargo} · ` : ""}
            {contato.empresa || "—"} ·{" "}
            <span className="font-mono">
              {new Date(contato.created_at).toLocaleString("pt-BR")}
            </span>
          </p>
        </div>
        <StatusUpdater id={contato.id} current={contato.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="E-mail" value={contato.email} copy />
        <Field label="Telefone" value={contato.telefone || "—"} copy={!!contato.telefone} />
        <Field label="Empresa" value={contato.empresa || "—"} />
        <Field label="Cargo" value={contato.cargo || "—"} />
        <Field
          label="Faturamento estimado"
          value={contato.faturamento_estimado || "—"}
        />
        <Field label="Origem" value={contato.origem} />
      </div>

      {contato.mensagem && (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-3">
            Mensagem
          </div>
          <p className="text-[14px] leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap">
            {contato.mensagem}
          </p>
        </div>
      )}

      {simulacao && (
        <div className="border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5 p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-3">
            Simulação vinculada
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
            <div>
              <div className="text-[10px] uppercase text-[color:var(--color-ink-muted)] mb-1">
                Faturamento
              </div>
              <div className="font-mono">{formatBRL(Number(simulacao.faturamento), { compact: true })}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[color:var(--color-ink-muted)] mb-1">
                Despesa indireta
              </div>
              <div className="font-mono">{formatBRL(Number(simulacao.despesa_indireta), { compact: true })}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[color:var(--color-ink-muted)] mb-1">
                Setor / Regime
              </div>
              <div className="font-mono capitalize">{simulacao.setor} · {simulacao.regime}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[color:var(--color-ink-muted)] mb-1">
                Total estimado
              </div>
              <div className="font-mono text-[color:var(--color-brand)] font-bold">
                {formatBRL(Number(simulacao.total), { compact: true })}
              </div>
            </div>
          </div>
          <Link
            href={`/admin/simulacoes/${simulacao.id}`}
            className="mt-4 inline-block text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand)] hover:underline"
          >
            Ver simulação completa →
          </Link>
        </div>
      )}

      <NotasInternas id={contato.id} initial={contato.notas_internas || ""} />
    </div>
  );
}

function Field({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1.5">
        {label}
      </div>
      <div className="text-[14px] text-[color:var(--color-ink)] break-words">
        {copy ? (
          <a
            href={
              label === "E-mail"
                ? `mailto:${value}`
                : label === "Telefone"
                ? `tel:${value.replace(/[^\d+]/g, "")}`
                : "#"
            }
            className="hover:text-[color:var(--color-brand)] underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
