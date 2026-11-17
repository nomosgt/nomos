import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/admin/setup-notice";
import { ShellSala } from "@/components/shell/shell-sala";
import { AssistenteChat } from "@/components/sala/assistente-chat";

export const metadata: Metadata = {
  title: "Sala Arché",
  robots: { index: false, follow: false },
};

export default async function SalaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <div className="min-h-screen bg-[color:var(--color-background)]">
        {children}
      </div>
    );
  }

  const { data: client } = await supabase
    .from("client_profiles")
    .select("nome, empresa")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    redirect("/sala/login?erro=sem_permissao");
  }

  return (
    <>
      <ShellSala nome={client.nome || "Cliente"} empresa={client.empresa}>
        {children}
      </ShellSala>
      <AssistenteChat />
    </>
  );
}
