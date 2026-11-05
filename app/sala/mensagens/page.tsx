import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MensagensChat } from "@/components/sala/mensagens-chat";

export const dynamic = "force-dynamic";

export default async function MensagensPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/sala/login");
  const userId = u.user.id;

  // inclui anexo (v16); tolera ambiente anterior à migração
  let { data: msgs, error: msgsErr } = await supabase
    .from("case_messages")
    .select("id, created_at, conteudo, autor_tipo, lido, anexo_path, anexo_nome")
    .eq("client_id", userId)
    .order("created_at", { ascending: true });
  if (msgsErr && /anexo|column/i.test(msgsErr.message)) {
    const retry = await supabase
      .from("case_messages")
      .select("id, created_at, conteudo, autor_tipo, lido")
      .eq("client_id", userId)
      .order("created_at", { ascending: true });
    msgs = retry.data as typeof msgs;
  }

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
          Histórico de conversa com o time Arché.
        </p>
      </div>
      <MensagensChat initial={msgs || []} />
    </div>
  );
}
