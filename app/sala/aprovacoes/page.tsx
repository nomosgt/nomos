import { createClient } from "@/lib/supabase/server";
import { AprovacaoCard } from "@/components/sala/aprovacao-card";

export const dynamic = "force-dynamic";

export default async function Aprovacoes() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user!.id;

  const { data: aprovacoes } = await supabase
    .from("client_aprovacoes")
    .select("*")
    .eq("client_id", userId)
    .order("created_at", { ascending: false });

  const pendentes = (aprovacoes ?? []).filter((a) => a.status === "pendente");
  const respondidas = (aprovacoes ?? []).filter((a) => a.status !== "pendente");

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Aprovações
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Decisões que a equipe Arché precisa da sua autorização para avançar.
          Nada é executado sem o seu aval.
        </p>
      </div>

      {pendentes.length > 0 ? (
        <div className="space-y-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-amber-700">
            Aguardando sua decisão ({pendentes.length})
          </div>
          {pendentes.map((a) => (
            <AprovacaoCard key={a.id} aprovacao={a} />
          ))}
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-12 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhuma decisão pendente. Quando a equipe precisar da sua autorização,
          a solicitação aparece aqui.
        </div>
      )}

      {respondidas.length > 0 && (
        <div className="space-y-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-ink-muted)]">
            Histórico
          </div>
          {respondidas.map((a) => (
            <AprovacaoCard key={a.id} aprovacao={a} />
          ))}
        </div>
      )}
    </div>
  );
}
