import { createClient } from "@/lib/supabase/server";
import { MensagensChat } from "@/components/sala/mensagens-chat";

export const dynamic = "force-dynamic";

export default async function MensagensPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user!.id;

  const { data: msgs } = await supabase
    .from("case_messages")
    .select("id, created_at, conteudo, autor_tipo, lido")
    .eq("client_id", userId)
    .order("created_at", { ascending: true });

  // Marca como lidas as do admin não lidas
  await supabase
    .from("case_messages")
    .update({ lido: true })
    .eq("client_id", userId)
    .eq("autor_tipo", "admin")
    .eq("lido", false);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
          Mensagens
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink-muted)]">
          Histórico de conversa com o time NGT.
        </p>
      </div>
      <MensagensChat initial={msgs || []} />
    </div>
  );
}
