import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/admin/setup-notice";
import { ShellAdmin } from "@/components/shell/shell-admin";

export const metadata: Metadata = {
  title: "Admin · Arché",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defesa: sem Supabase configurado, mostra setup notice em vez de crashar
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // Login fica sempre acessível — não bloqueia aqui
  if (!user) {
    return (
      <div className="min-h-screen bg-[color:var(--color-background)]">
        {children}
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("nome, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/admin/login?erro=sem_permissao");
  }

  return (
    <ShellAdmin
      nome={profile.nome || user.email || "Admin"}
      role={profile.role || "admin"}
    >
      {children}
    </ShellAdmin>
  );
}
// end of AdminLayout
