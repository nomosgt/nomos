import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [stats, novosContatos, ultimasSimulacoes] = await Promise.all([
    supabase.from("admin_dashboard_stats").select("*").single(),
    supabase
      .from("contact_submissions")
      .select("id, created_at, nome, empresa, status, origem")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("simulator_runs")
      .select("id, created_at, faturamento, setor, regime, total")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const s = stats.data;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Visão geral
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Snapshot do que está entrando no NGT.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
        <Kpi
          label="Contatos novos"
          value={String(s?.contatos_novos ?? 0)}
          href="/admin/contatos?status=novo"
        />
        <Kpi
          label="Contatos (total)"
          value={String(s?.contatos_total ?? 0)}
          href="/admin/contatos"
        />
        <Kpi
          label="Simulações 30d"
          value={String(s?.simulacoes_30d ?? 0)}
          href="/admin/simulacoes"
        />
        <Kpi
          label="Ticket médio 30d"
          value={formatBRL(Number(s?.ticket_medio_30d ?? 0), { compact: true })}
          href="/admin/simulacoes"
        />
      </div>

      {/* Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Últimos contatos" href="/admin/contatos">
          {novosContatos.data && novosContatos.data.length > 0 ? (
            <ul className="divide-y divide-[color:var(--color-hairline)]">
              {novosContatos.data.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/contatos/${c.id}`}
                    className="block px-5 py-4 hover:bg-[color:var(--color-surface)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-[14px]">{c.nome}</div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-[12px] text-[color:var(--color-ink-muted)] flex items-center gap-3">
                      <span>{c.empresa || "—"}</span>
                      <span className="text-[color:var(--color-ink-faint)]">·</span>
                      <span>{relativeTime(c.created_at)}</span>
                      <span className="text-[color:var(--color-ink-faint)]">·</span>
                      <span className="font-mono uppercase tracking-wider text-[10px]">
                        {c.origem}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum contato ainda.</Empty>
          )}
        </Card>

        <Card title="Últimas simulações" href="/admin/simulacoes">
          {ultimasSimulacoes.data && ultimasSimulacoes.data.length > 0 ? (
            <ul className="divide-y divide-[color:var(--color-hairline)]">
              {ultimasSimulacoes.data.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/simulacoes/${r.id}`}
                    className="block px-5 py-4 hover:bg-[color:var(--color-surface)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-[14px] capitalize">
                        {r.setor} · {r.regime === "real" ? "Lucro Real" : "Lucro Presumido"}
                      </div>
                      <div className="font-mono text-[13px] text-[color:var(--color-brand)]">
                        {formatBRL(Number(r.total), { compact: true })}
                      </div>
                    </div>
                    <div className="text-[12px] text-[color:var(--color-ink-muted)] flex items-center gap-3">
                      <span>Faturamento: {formatBRL(Number(r.faturamento), { compact: true })}</span>
                      <span className="text-[color:var(--color-ink-faint)]">·</span>
                      <span>{relativeTime(r.created_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma simulação ainda.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-[color:var(--color-paper)] p-6 hover:bg-[color:var(--color-surface)] transition-colors block"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-3">
        {label}
      </div>
      <div className="font-mono text-3xl lg:text-4xl tracking-tight text-[color:var(--color-ink)] leading-none">
        {value}
      </div>
    </Link>
  );
}

function Card({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[color:var(--color-hairline)]">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
          {title}
        </h2>
        <Link
          href={href}
          className="text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand)] hover:underline"
        >
          Ver todos →
        </Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-12 text-center text-[13px] text-[color:var(--color-ink-faint)]">
      {children}
    </div>
  );
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return date.toLocaleDateString("pt-BR");
}
