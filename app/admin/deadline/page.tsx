import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { derivarAlerta } from "@/lib/atividades/alertas";
import { PageHeader, Cd, StTag, fmtData } from "@/components/shell/proto-ui";
import { DeadlineProjetos } from "@/components/admin/deadline-projetos";

export const dynamic = "force-dynamic";

/**
 * Admin · Deadline — tela do protótipo (etapas por projeto, pendências
 * documentais, visibilidade no portal) + demandas da equipe por prazo.
 */
export default async function DeadlinePage() {
  if (!isSupabaseConfigured()) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("atividades")
    .select("id, titulo, status, prazo, parceiros_codigos ( nome ), client_profiles ( nome, empresa )")
    .not("status", "in", "(concluida,cancelada)")
    .order("prazo", { ascending: true, nullsFirst: false })
    .limit(100);

  const demandas = (data ?? []).map((a) => ({
    id: a.id as string,
    titulo: a.titulo as string,
    status: a.status as string,
    prazo: a.prazo as string | null,
    responsavel: (a.parceiros_codigos as unknown as { nome: string } | null)?.nome || "Equipe Arché",
    cliente:
      (a.client_profiles as unknown as { empresa: string | null; nome: string } | null)?.empresa ||
      (a.client_profiles as unknown as { nome: string } | null)?.nome || null,
    alerta: derivarAlerta(a.status as string, a.prazo as string),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Gestão / Deadline"
        title="Deadline dos"
        em="projetos"
        sub="Etapa atual, prazos e pendências documentais de cada projeto. Marque o que fica visível no portal do cliente."
        actions={
          <Link
            href="/admin/relatorios"
            className="inline-flex h-[38px] items-center gap-2 rounded-[9px] border border-[#dedbd3] bg-white px-4 text-[13px] font-semibold text-[#14173d] transition-colors hover:border-[#0f1240]"
          >
            ↓ Relatório
          </Link>
        }
      />

      <DeadlineProjetos />

      {/* Demandas da equipe com prazo (visão anterior, mantida como seção) */}
      <div className="mt-6">
        <Cd title="Demandas da equipe por prazo" mono={`${demandas.length} abertas`}>
          {demandas.length === 0 ? (
            <p className="text-[13px] text-[#8a8ca3]">Nenhuma demanda aberta com prazo.</p>
          ) : (
            <div className="space-y-2">
              {demandas.map((a) => (
                <Link key={a.id} href="/admin/atividades" className="flex flex-wrap items-center gap-3 border-b border-[#f1eee8] pb-2 last:border-0">
                  <span className={`h-2.5 w-2.5 flex-none rounded-full ${a.alerta === "atraso" ? "bg-rose-500" : a.alerta ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#0f1240]">{a.titulo}</span>
                  <span className="font-mono text-[11px] text-[#8a8ca3]">{a.responsavel}{a.cliente ? ` · ${a.cliente}` : ""}</span>
                  <span className={`whitespace-nowrap font-mono text-[12px] ${a.alerta === "atraso" ? "font-semibold text-rose-700" : "text-[#6b6e88]"}`}>
                    {a.prazo ? fmtData(a.prazo, true) : "sem prazo"}
                  </span>
                  <StTag tone={a.alerta === "atraso" ? "bad" : a.status === "aguardando_revisao" ? "warn" : "info"}>
                    {a.status.replace("_", " ")}
                  </StTag>
                </Link>
              ))}
            </div>
          )}
        </Cd>
      </div>
    </div>
  );
}
