import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/proto-ui";
import { ContaCard } from "@/components/shell/conta-card";

export const dynamic = "force-dynamic";

export default async function AdminContaPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/admin/login");
  const { data: prof } = await supabase.from("admin_profiles").select("nome, role").eq("user_id", u.user.id).maybeSingle();

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Minha" em="conta" sub="Seus dados de acesso e segurança." />
      <ContaCard nome={prof?.nome || "Admin"} email={u.user.email || "—"} sub={prof?.role || "admin"} />
    </div>
  );
}
