import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatBRL } from "@/lib/utils";
import { derivarAlerta } from "@/lib/atividades/alertas";
import { StatusBadge } from "@/components/admin/status-badge";
import { CopilotoWidget } from "@/components/admin/copiloto-widget";
import { NotificacoesAdmin } from "@/components/admin/notificacoes-admin";

export const dynamic = "force-dynamic";

async function alertasAtividades(): Promise<{ atrasadas: number; avisos: number }> {
  if (!isSupabaseConfigured()) return { atrasadas: 0, avisos: 0 };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("atividades")
      .select("status, prazo")
      .neq("status", "concluida")
      .not("prazo", "is", null);
    if (error || !data) return { atrasadas: 0, avisos: 0 };
    let atrasadas = 0, avisos = 0;
    for (const a of data) {
      const t = derivarAlerta(a.status as string, a.prazo as string);
      if (t === "atraso") atrasadas++;
      else if (t === "aviso_24h" || t === "aviso_48h") avisos++;
    }
    return { atrasadas, avisos };
  } catch {
    return { atrasadas: 0, avisos: 0 };
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [stats, novosContatos, ultimasSimulacoes, alertas] = await Promise.all([
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
    alertasAtividades(),
  ]);

  const s = stats.data;

  return (
    <div className="space-y-12">
      <NotificacoesAdmin />
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Visão geral
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Snapshot do que está entrando na Arché.
        </p>
      </div>

      <CopilotoWidget />

      {/* Alerta de prazos da equipe */}
      {(alertas.atrasadas > 0 || alertas.avisos > 0) && (
        <Link
          href="/admin/atividades"
          className={`flex items-center gap-3 border-l-4 p-4 transition-colors ${
            alertas.atrasadas > 0
              ? "border-rose-600 bg-rose-50 hover:bg-rose-100/60"
              : "border-amber-500 bg-amber-50 hover:bg-amber-100/60"
          }`}
        >
          {alertas.atrasadas > 0 ? <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0" /> : <Clock className="w-5 h-5 text-amber-700 flex-shrink-0" />}
          <div className="text-[13.5px]">
            {alertas.atrasadas > 0 && (
              <span className="font-semibold text-rose-900">{alertas.atrasadas} atividade{alertas.atrasadas > 1 ? "s" : ""} atrasada{alertas.atrasadas > 1 ? "s" : ""}</span>
            )}
            {alertas.atrasadas > 0 && alertas.avisos > 0 && <span className="text-[color:var(--color-ink-muted)]"> · </span>}
            {alertas.avisos > 0 && (
              <span className={alertas.atrasadas > 0 ? "text-[color:var(--color-ink-muted)]" : "font-semibold text-amber-900"}>{alertas.avisos} vencem em até 48h</span>
            )}
            <span className="text-[color:var(--color-ink-muted)]"> — ver atividades →</span>
          </div>
        </Link>
      )}

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
