import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { ArrowUpRight, Bell, FileText, MessageCircle, TrendingUp, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const ETAPA_LABEL = [
  "—",
  "Reunião Preliminar",
  "NDA assinado",
  "Envios & Habilitação",
  "Análise Estratégica",
  "Apresentação Estratégica",
  "Contrato Assinado",
  "Em Execução",
];

const STATUS_COLOR: Record<string, string> = {
  em_andamento: "bg-blue-100 text-blue-800",
  pausado: "bg-amber-100 text-amber-800",
  concluido: "bg-emerald-100 text-emerald-800",
  arquivado: "bg-gray-200 text-gray-700",
};

const TIPO_COLOR: Record<string, { color: string; label: string }> = {
  info: { color: "text-blue-700 border-blue-200 bg-blue-50", label: "Info" },
  marco: { color: "text-emerald-700 border-emerald-200 bg-emerald-50", label: "Marco" },
  recebimento: { color: "text-emerald-700 border-emerald-200 bg-emerald-50", label: "Recebimento" },
  pendencia: { color: "text-amber-700 border-amber-200 bg-amber-50", label: "Pendência" },
  risco: { color: "text-red-700 border-red-200 bg-red-50", label: "Risco" },
};

export default async function SalaDashboard() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user!.id;

  const [stats, cases, updates, msgs] = await Promise.all([
    supabase.from("client_dashboard").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("client_cases").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("case_updates")
      .select("id, created_at, titulo, corpo, tipo, case_id, client_cases!inner(client_id, titulo)")
      .eq("client_cases.client_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("case_messages")
      .select("id")
      .eq("client_id", userId)
      .eq("lido", false)
      .eq("autor_tipo", "admin"),
  ]);

  const s = stats.data;
  const totalRecuperado = s?.caixa_recuperado_total ? Number(s.caixa_recuperado_total) : 0;
  const casoAtivo = cases.data?.find((c) => c.status === "em_andamento") || cases.data?.[0];

  return (
    <div className="space-y-10">
      {/* Boas-vindas */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-3">
          Painel
        </div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight">
          Olá, {s?.nome?.split(" ")[0] || "cliente"}.
        </h1>
        {s?.empresa && (
          <p className="mt-2 text-[14px] text-[color:var(--color-ink-muted)]">
            {s.empresa}
          </p>
        )}
      </div>

      {/* Hero: caixa recuperado */}
      <div className="bg-[color:var(--color-ink)] text-[color:var(--color-paper)] p-8 lg:p-12 grain relative overflow-hidden">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-brand-soft)] mb-4 flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          Caixa recuperado · acumulado
        </div>
        <div className="font-mono text-[clamp(2.5rem,9vw,7rem)] tracking-tighter leading-[0.9]">
          <span className="text-[color:var(--color-paper)]/55 text-[0.4em] mr-2 align-top">R$</span>
          {formatBRL(totalRecuperado).replace(/^R\$\s*/, "")}
        </div>
        <div className="mt-6 pt-6 border-t border-[color:var(--color-paper)]/15 grid grid-cols-2 md:grid-cols-3 gap-6 text-[13px]">
          <Stat label="Casos em andamento" value={String(s?.casos_em_andamento ?? 0)} />
          <Stat label="Casos concluídos" value={String(s?.casos_concluidos ?? 0)} />
          <Stat
            label="Mensagens não lidas"
            value={String(msgs.data?.length ?? 0)}
            highlight={(msgs.data?.length ?? 0) > 0}
          />
        </div>
      </div>

      {/* Caso ativo */}
      {casoAtivo && (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-8 lg:p-10">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-ink-muted)] mb-2 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Caso ativo
              </div>
              <h2 className="font-serif text-2xl lg:text-3xl tracking-tight">
                {casoAtivo.titulo}
              </h2>
              {casoAtivo.tese && (
                <div className="text-[13px] text-[color:var(--color-ink-muted)] mt-1">
                  {casoAtivo.tese}
                </div>
              )}
            </div>
            <span
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${STATUS_COLOR[casoAtivo.status] || ""}`}
            >
              {casoAtivo.status.replace("_", " ")}
            </span>
          </div>

          {/* Timeline 7 etapas */}
          <div className="mt-8 mb-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <div
                  key={n}
                  className={`flex-1 h-1 ${
                    n <= casoAtivo.etapa
                      ? "bg-[color:var(--color-brand)]"
                      : "bg-[color:var(--color-hairline)]"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.15em] text-[color:var(--color-ink-muted)]">
              <span>
                Etapa {casoAtivo.etapa} de 7 ·{" "}
                <strong className="text-[color:var(--color-ink)]">
                  {ETAPA_LABEL[casoAtivo.etapa]}
                </strong>
              </span>
              {casoAtivo.data_estimada_conclusao && (
                <span className="text-[color:var(--color-ink-faint)]">
                  Previsão:{" "}
                  {new Date(casoAtivo.data_estimada_conclusao).toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {casoAtivo.proxima_acao && (
            <div className="bg-[color:var(--color-surface)] p-5 border-l-2 border-[color:var(--color-brand)]">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-brand)] mb-2">
                Próxima ação
              </div>
              <p className="text-[15px] text-[color:var(--color-ink)] leading-relaxed">
                {casoAtivo.proxima_acao}
              </p>
            </div>
          )}

          {casoAtivo.potencial_estimado && (
            <div className="mt-5 grid grid-cols-2 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
              <div className="bg-[color:var(--color-paper)] p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1">
                  Potencial estimado
                </div>
                <div className="font-mono text-xl">
                  {formatBRL(Number(casoAtivo.potencial_estimado), { compact: true })}
                </div>
              </div>
              <div className="bg-[color:var(--color-paper)] p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] mb-1">
                  Recuperado neste caso
                </div>
                <div className="font-mono text-xl text-[color:var(--color-brand)]">
                  {formatBRL(Number(casoAtivo.valor_recuperado), { compact: true })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Últimas atualizações */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)] flex items-center gap-2">
            <Bell className="w-3 h-3" /> Últimas atualizações
          </h2>
          <Link
            href="/sala/atualizacoes"
            className="text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-brand)] hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        {updates.data && updates.data.length > 0 ? (
          <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] divide-y divide-[color:var(--color-hairline)]">
            {updates.data.map((u) => {
              const tipo = TIPO_COLOR[u.tipo as string] || TIPO_COLOR.info;
              return (
                <div key={u.id} className="p-5 flex gap-4">
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${tipo.color}`}>
                      {tipo.label}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[14px] mb-1">{u.titulo}</div>
                    {u.corpo && (
                      <p className="text-[13px] text-[color:var(--color-ink-muted)] leading-relaxed line-clamp-2">
                        {u.corpo}
                      </p>
                    )}
                    <div className="mt-2 text-[11px] font-mono text-[color:var(--color-ink-faint)]">
                      {new Date(u.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-10 text-center text-[13px] text-[color:var(--color-ink-faint)]">
            Sem atualizações por enquanto. A equipe NGT posta aqui conforme o caso avança.
          </div>
        )}
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--color-hairline)] border border-[color:var(--color-hairline)]">
        <Shortcut href="/sala/documentos" icon={FileText} title="Documentos" />
        <Shortcut href="/sala/mensagens" icon={MessageCircle} title="Mensagens" />
        <Shortcut href="/sala/suporte" icon={MessageCircle} title="Suporte direto" />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-paper)]/45 mb-1">
        {label}
      </div>
      <div className={`font-mono text-2xl ${highlight ? "text-[color:var(--color-brand-soft)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Shortcut({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-[color:var(--color-paper)] p-6 hover:bg-[color:var(--color-surface)] transition-colors flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[color:var(--color-brand)]" />
        <span className="font-mono text-[12px] uppercase tracking-[0.25em] text-[color:var(--color-ink)]">
          {title}
        </span>
      </div>
      <ArrowUpRight className="w-4 h-4 text-[color:var(--color-ink-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
