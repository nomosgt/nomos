import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatBRL } from "@/lib/utils";
import { derivarAlerta } from "@/lib/atividades/alertas";
import { CopilotoWidget } from "@/components/admin/copiloto-widget";
import { NotificacoesAdmin } from "@/components/admin/notificacoes-admin";
import { Kc, Cd, Barra, StTag, saudacao, dataLonga, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

const ETAPAS = ["—", "Reunião Preliminar", "NDA assinado", "Envios & Habilitação", "Análise Estratégica", "Apresentação Estratégica", "Contrato Assinado", "Em Execução"];

async function seguro<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
  try {
    const r = await p;
    return r.error ? null : r.data;
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const { data: prof } = u.user
    ? await supabase.from("admin_profiles").select("nome").eq("user_id", u.user.id).maybeSingle()
    : { data: null };
  const primeiroNome = (prof?.nome || "Arché").split(" ")[0];

  const admin = createAdminClient();
  const [casos, atividades, analises, aprovs, reunioes, indicacoes] = await Promise.all([
    seguro(admin.from("client_cases").select("id, titulo, status, etapa, potencial_estimado, valor_recuperado, client_id, client_profiles ( nome, empresa )").neq("status", "arquivado").limit(400)),
    seguro(admin.from("atividades").select("id, titulo, status, prazo, parceiros_codigos ( nome )").not("status", "in", "(concluida,cancelada)").limit(400)),
    seguro(admin.from("analises").select("id, titulo, status").eq("status", "enviada").limit(100)),
    seguro(admin.from("client_aprovacoes").select("id").eq("status", "pendente").limit(200)),
    seguro(admin.from("reunioes").select("id, titulo, solicitante_nome, data_sugerida, criado_em").eq("status", "solicitada").order("criado_em", { ascending: false }).limit(5)),
    seguro(admin.from("indicacoes").select("id, empresa, parceiro_nome, criado_em").eq("status", "recebida").order("criado_em", { ascending: false }).limit(5)),
  ]);

  const listaCasos = casos ?? [];
  const ativos = listaCasos.filter((c) => c.status === "em_andamento");
  const potencialTotal = listaCasos.reduce((a, c) => a + (c.potencial_estimado ? Number(c.potencial_estimado) : 0), 0);
  const recuperadoTotal = listaCasos.reduce((a, c) => a + (c.valor_recuperado ? Number(c.valor_recuperado) : 0), 0);

  // carteira por etapa (1..7)
  const porEtapa = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const c of listaCasos) if (c.etapa >= 1 && c.etapa <= 7) porEtapa[c.etapa]++;
  const maxEtapa = Math.max(1, ...porEtapa);

  // atenção: atrasadas + trabalhos em revisão
  const abertas = atividades ?? [];
  const atrasadas = abertas.filter((a) => derivarAlerta(a.status as string, a.prazo as string) === "atraso");
  const emRevisao = abertas.filter((a) => a.status === "aguardando_revisao");
  const alertas = [
    ...atrasadas.slice(0, 4).map((a) => ({
      id: a.id as string, titulo: a.titulo as string, tipo: "atraso" as const,
      sub: `Demanda atrasada · ${(a.parceiros_codigos as unknown as { nome: string } | null)?.nome || "Equipe"} · prazo ${a.prazo ? fmtData(a.prazo as string) : "—"}`,
    })),
    ...(analises ?? []).slice(0, 3).map((t) => ({
      id: t.id as string, titulo: t.titulo as string, tipo: "revisao" as const,
      sub: "Trabalho aguardando revisão",
    })),
  ];

  // carga da equipe: demandas abertas por responsável
  const carga = new Map<string, number>();
  for (const a of abertas) {
    const nome = (a.parceiros_codigos as unknown as { nome: string } | null)?.nome || "Equipe Arché";
    carga.set(nome, (carga.get(nome) || 0) + 1);
  }
  const cargaLista = [...carga.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6);
  const maxCarga = Math.max(1, ...cargaLista.map(([, n]) => n));

  const emAndamento = ativos
    .slice()
    .sort((a, b) => Number(b.potencial_estimado || 0) - Number(a.potencial_estimado || 0))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <NotificacoesAdmin />

      {/* Saudação do protótipo */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#7a7c95]">{dataLonga()}</div>
          <h1 className="font-serif text-[clamp(32px,3vw,44px)] font-normal leading-[1.05] tracking-[-0.01em] text-[#0f1240]">
            {saudacao()}, <em className="italic text-[#3a40c9]">{primeiroNome}</em>.
          </h1>
          <p className="mt-2 text-[13.5px] text-[#6b6e88]">Visão consolidada da carteira, da equipe e das autorizações.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/relatorios" className="inline-flex h-[38px] items-center gap-2 rounded-[9px] border border-[#dedbd3] bg-white px-4 text-[13px] font-semibold text-[#14173d] transition-colors hover:border-[#0f1240]">Relatórios</Link>
          <Link href="/admin/clientes" className="inline-flex h-[38px] items-center gap-2 rounded-[9px] bg-[#0f1240] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#3a40c9]">+ Novo projeto</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kc dark label="Potencial identificado" value={formatBRL(potencialTotal, { compact: true })} sub={`${ativos.length} projetos ativos`} />
        <Kc label="Recuperado para clientes" value={formatBRL(recuperadoTotal, { compact: true })} sub="acumulado da carteira" />
        <Kc label="Autorizações" value={String(aprovs?.length ?? 0)} sub="pendentes com cliente" tone={(aprovs?.length ?? 0) > 0 ? "warn" : "ok"} />
        <Kc label="Em revisão interna" value={String(emRevisao.length + (analises?.length ?? 0))} sub={`${emRevisao.length} demandas · ${analises?.length ?? 0} trabalhos`} tone={emRevisao.length + (analises?.length ?? 0) > 0 ? "warn" : "ok"} />
      </div>

      {/* Indicações novas + Reuniões solicitadas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Cd title="Indicações novas" mono={<LinkVer href="/admin/indicacoes" />}>
          {(indicacoes ?? []).length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Nenhuma pendente.</p>
          ) : (
            <div className="space-y-2.5">
              {(indicacoes ?? []).map((i) => (
                <Link key={i.id} href="/admin/indicacoes" className="block">
                  <div className="text-[14px] font-semibold text-[#0f1240]">{i.empresa}</div>
                  <div className="font-mono text-[11px] text-[#8a8ca3]">{i.parceiro_nome || "Parceiro"} · {fmtData(i.criado_em)}</div>
                </Link>
              ))}
            </div>
          )}
        </Cd>
        <Cd title="Reuniões solicitadas" mono={<LinkVer href="/admin/reunioes" />}>
          {(reunioes ?? []).length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Nenhuma pendente.</p>
          ) : (
            <div className="space-y-2.5">
              {(reunioes ?? []).map((r) => (
                <Link key={r.id} href="/admin/reunioes" className="block">
                  <div className="text-[14px] font-semibold text-[#0f1240]">{r.titulo}</div>
                  <div className="font-mono text-[11px] text-[#8a8ca3]">
                    {r.solicitante_nome || "—"}{r.data_sugerida ? ` · ${fmtData(r.data_sugerida, true)}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Cd>
      </div>

      {/* Carteira por etapa + Atenção */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Cd title="Carteira por etapa" mono={`${listaCasos.length} projetos`}>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="flex items-center gap-4">
                <span className="w-[180px] flex-none text-[13px] text-[#14173d]">{ETAPAS[n]}</span>
                <Barra pct={(porEtapa[n] / maxEtapa) * 100} />
                <span className="w-6 flex-none text-right font-mono text-[12.5px] text-[#6b6e88]">{porEtapa[n]}</span>
              </div>
            ))}
          </div>
        </Cd>
        <Cd title="Atenção" mono={`${alertas.length} alertas`}>
          {alertas.length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Nada urgente agora.</p>
          ) : (
            <div className="space-y-3">
              {alertas.map((a) => (
                <Link key={a.id} href={a.tipo === "atraso" ? "/admin/atividades" : "/admin/analises"} className="flex items-start gap-3">
                  <span className={`mt-1 h-2 w-2 flex-none rounded-full ${a.tipo === "atraso" ? "bg-rose-500" : "bg-amber-400"}`} />
                  <span>
                    <span className="block text-[13.5px] font-semibold text-[#0f1240]">{a.titulo}</span>
                    <span className="block font-mono text-[11px] text-[#8a8ca3]">{a.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Cd>
      </div>

      {/* Projetos em andamento + Carga da equipe */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Cd title="Projetos em andamento" mono={<LinkVer href="/admin/projetos" rotulo="Ver todos" />}>
          {emAndamento.length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Nenhum projeto em andamento.</p>
          ) : (
            <div className="space-y-4">
              {emAndamento.map((c) => {
                const cp = c.client_profiles as unknown as { nome: string; empresa: string | null } | null;
                return (
                  <Link key={c.id} href={`/admin/clientes/${c.client_id}`} className="block">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-semibold text-[#0f1240]">{c.titulo}</div>
                        <div className="font-mono text-[11px] text-[#8a8ca3]">{cp?.empresa || cp?.nome || "—"} · {ETAPAS[c.etapa] || "—"}</div>
                      </div>
                      {c.potencial_estimado != null && (
                        <span className="font-serif text-[17px] text-[#0f1240]">{formatBRL(Number(c.potencial_estimado), { compact: true })}</span>
                      )}
                      {Number(c.valor_recuperado) > 0 && (
                        <span className="text-[13px] font-semibold text-[#1d8a5a]">{formatBRL(Number(c.valor_recuperado), { compact: true })}</span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <div key={n} className={`h-1 flex-1 rounded-full ${n <= c.etapa ? "bg-[#0f1240]" : "bg-[#ebe8e1]"}`} />
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Cd>
        <Cd title="Carga da equipe" mono="demandas abertas">
          {cargaLista.length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Nenhuma demanda aberta.</p>
          ) : (
            <div className="space-y-3">
              {cargaLista.map(([nome, n]) => (
                <div key={nome} className="flex items-center gap-3">
                  <span className="w-[120px] flex-none truncate text-[13px] text-[#14173d]">{nome}</span>
                  <Barra pct={(n / maxCarga) * 100} />
                  <span className="w-5 flex-none text-right font-mono text-[12.5px] text-[#6b6e88]">{n}</span>
                </div>
              ))}
            </div>
          )}
          {atrasadas.length > 0 && (
            <div className="mt-4 border-t border-[#f1eee8] pt-3">
              <StTag tone="bad">{atrasadas.length} atrasada(s)</StTag>
            </div>
          )}
        </Cd>
      </div>

      <CopilotoWidget />
    </div>
  );
}

function LinkVer({ href, rotulo = "Ver" }: { href: string; rotulo?: string }) {
  return (
    <Link href={href} className="font-sans text-[12px] font-semibold normal-case tracking-normal text-[#3a40c9] hover:underline">
      {rotulo} →
    </Link>
  );
}
