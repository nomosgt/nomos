import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SimulacaoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r, error } = await supabase
    .from("simulator_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !r) notFound();

  let lead = null;
  if (r.contact_submission_id) {
    const { data } = await supabase
      .from("contact_submissions")
      .select("id, nome, email, empresa")
      .eq("id", r.contact_submission_id)
      .maybeSingle();
    lead = data;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        href="/admin/simulacoes"
        className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
      >
        <ArrowLeft className="w-3 h-3" />
        Todas as simulações
      </Link>

      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Simulação
        </h1>
        <p className="text-[13px] text-[color:var(--color-ink-muted)] font-mono">
          {new Date(r.created_at).toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-paper)]/50 mb-3">
          Total estimado
        </div>
        <div className="font-mono text-5xl lg:text-7xl tracking-tighter">
          {formatBRL(Number(r.total))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
        <Box label="Faturamento" value={formatBRL(Number(r.faturamento), { compact: true })} />
        <Box label="Despesa Indireta" value={formatBRL(Number(r.despesa_indireta), { compact: true })} />
        <Box label="Setor" value={<span className="capitalize">{r.setor}</span>} />
        <Box label="Regime" value={r.regime === "real" ? "Lucro Real" : "Lucro Presumido"} />
      </div>

      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-4">
          Composição
        </h2>
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] divide-y divide-[color:var(--color-hairline)]">
          <Row label="Tese Judicial" value={Number(r.tese_judicial)} total={Number(r.total)} />
          <Row label="Tese Administrativa" value={Number(r.tese_administrativa)} total={Number(r.total)} />
          {Number(r.icms_comercio) > 0 && (
            <Row label="ICMS Comércio" value={Number(r.icms_comercio)} total={Number(r.total)} />
          )}
          <div className="px-5 py-3 flex items-center justify-between bg-[color:var(--color-surface)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]">
              Total
            </div>
            <div className="font-mono font-bold">{formatBRL(Number(r.total))}</div>
          </div>
        </div>
      </div>

      {lead && (
        <div className="border border-[color:var(--color-brand)]/30 bg-[color:var(--color-brand)]/5 p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-3">
            Convertido em lead
          </div>
          <Link
            href={`/admin/contatos/${lead.id}`}
            className="text-[14px] hover:underline"
          >
            {lead.nome} {lead.empresa ? `· ${lead.empresa}` : ""} · {lead.email}
          </Link>
        </div>
      )}

      {r.user_agent && (
        <details className="text-[11px] text-[color:var(--color-ink-faint)] font-mono">
          <summary className="cursor-pointer">Detalhes técnicos</summary>
          <div className="mt-2 space-y-1">
            <div>User-Agent: {r.user_agent}</div>
            {r.referrer && <div>Referrer: {r.referrer}</div>}
            {r.ip_hash && <div>IP hash: {r.ip_hash}</div>}
          </div>
        </details>
      )}
    </div>
  );
}

function Box({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-[color:var(--color-paper)] p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-2">
        {label}
      </div>
      <div className="font-mono text-base">{value}</div>
    </div>
  );
}

function Row({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(0) : "0";
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <div className="text-[14px]">{label}</div>
      <div className="flex items-center gap-3 font-mono">
        <span className="text-[11px] text-[color:var(--color-ink-faint)]">{pct}%</span>
        <span className="text-[14px]">{formatBRL(value)}</span>
      </div>
    </div>
  );
}
