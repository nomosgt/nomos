import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/proto-ui";
import { ContaCard } from "@/components/shell/conta-card";

export const dynamic = "force-dynamic";

export default async function SalaContaPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/sala/login");
  const { data: prof } = await supabase.from("client_profiles").select("nome, empresa").eq("user_id", u.user.id).maybeSingle();

  return (
    <div>
      <PageHeader eyebrow="Sala Arché" title="Minha" em="conta" sub="Seus dados de acesso e segurança." />
      <ContaCard nome={prof?.nome || "Cliente"} email={u.user.email || "—"} sub={prof?.empresa || undefined} />
    </div>
  );
}
