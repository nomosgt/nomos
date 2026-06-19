import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TIPO_COLOR: Record<string, { color: string; label: string }> = {
  info: { color: "text-blue-700 border-blue-200 bg-blue-50", label: "Info" },
  marco: { color: "text-emerald-700 border-emerald-200 bg-emerald-50", label: "Marco" },
  recebimento: { color: "text-emerald-700 border-emerald-200 bg-emerald-50", label: "Recebimento" },
  pendencia: { color: "text-amber-700 border-amber-200 bg-amber-50", label: "Pendência" },
  risco: { color: "text-red-700 border-red-200 bg-red-50", label: "Risco" },
};

export default async function Atualizacoes() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user!.id;

  const { data: updates } = await supabase
    .from("case_updates")
    .select(
      "id, created_at, titulo, corpo, tipo, case_id, client_cases!inner(client_id, titulo)",
    )
    .eq("client_cases.client_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Atualizações
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Timeline completa do que vem acontecendo nos seus casos.
        </p>
      </div>

      {updates && updates.length > 0 ? (
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[color:var(--color-hairline)]" />
          <div className="space-y-6">
            {updates.map((u) => {
              const tipo = TIPO_COLOR[u.tipo as string] || TIPO_COLOR.info;
              const caso = (u.client_cases as unknown as { titulo: string } | null);
              return (
                <div key={u.id} className="relative pl-10">
                  <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-[color:var(--color-paper)] border-2 border-[color:var(--color-brand)]" />
                  <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-5">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${tipo.color}`}>
                        {tipo.label}
                      </span>
                      <span className="font-mono text-[11px] text-[color:var(--color-ink-faint)]">
                        {new Date(u.created_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {caso?.titulo && (
                        <span className="text-[11px] text-[color:var(--color-ink-muted)]">
                          · {caso.titulo}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-lg text-[color:var(--color-ink)] mb-2">
                      {u.titulo}
                    </h3>
                    {u.corpo && (
                      <p className="text-[14px] leading-relaxed text-[color:var(--color-ink-muted)] whitespace-pre-wrap">
                        {u.corpo}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-16 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhuma atualização registrada ainda.
        </div>
      )}
    </div>
  );
}
