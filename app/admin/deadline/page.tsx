import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { derivarAlerta } from "@/lib/atividades/alertas";
import { PageHeader, StTag, fmtData } from "@/components/shell/proto-ui";

export const dynamic = "force-dynamic";

/** Admin · Deadline — todas as atividades abertas ordenadas por prazo (protótipo). */
export default async function DeadlinePage() {
  if (!isSupabaseConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("atividades")
    .select("id, titulo, status, prioridade, prazo, parceiro_id, parceiros_codigos ( nome ), client_profiles ( nome, empresa )")
    .not("status", "in", "(concluida,cancelada)")
    .order("prazo", { ascending: true, nullsFirst: false })
    .limit(300);

  const itens = (data ?? []).map((a) => ({
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

  const atrasadas = itens.filter((i) => i.alerta === "atraso");
  const proximas = itens.filter((i) => i.alerta !== "atraso");

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Deadline dos"
        em="projetos"
        sub={`${itens.length} atividade(s) abertas · ${atrasadas.length} atrasada(s)`}
      />
      {error ? (
        <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-5 text-[13.5px] text-rose-800">
          Não foi possível carregar o deadline agora. Recarregue a página.
        </div>
      ) : itens.length === 0 ? (
        <div className="rounded-[10px] border border-[#e9e6df] bg-white p-10 text-center text-[13px] text-[#8a8ca3]">
          Nenhuma atividade aberta com prazo.
        </div>
      ) : (
        <div className="space-y-2.5">
          {[...atrasadas, ...proximas].map((a) => (
            <Link
              key={a.id}
              href="/admin/atividades"
              className="flex flex-wrap items-center gap-4 rounded-[10px] border border-[#e9e6df] bg-white px-5 py-4 transition-colors hover:border-[#0f1240]"
            >
              <span
                className={`h-2.5 w-2.5 flex-none rounded-full ${
                  a.alerta === "atraso" ? "bg-rose-500" : a.alerta ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-semibold text-[#0f1240]">{a.titulo}</div>
                <div className="mt-0.5 font-mono text-[11px] text-[#8a8ca3]">
                  {a.responsavel}
                  {a.cliente ? ` · ${a.cliente}` : ""}
                </div>
              </div>
              <div className={`whitespace-nowrap font-mono text-[12px] ${a.alerta === "atraso" ? "font-semibold text-rose-700" : "text-[#6b6e88]"}`}>
                {a.prazo ? fmtData(a.prazo, true) : "sem prazo"}
              </div>
              <StTag tone={a.alerta === "atraso" ? "bad" : a.status === "aguardando_revisao" ? "warn" : "info"}>
                {a.status.replace("_", " ")}
              </StTag>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
