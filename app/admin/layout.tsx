import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SetupNotice } from "@/components/admin/setup-notice";

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
    <div className="min-h-screen bg-[color:var(--color-surface)] flex">
      {/* Sidebar CRM — desktop */}
      <aside className="hidden lg:flex w-60 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] flex-col px-4 py-7 flex-shrink-0 sticky top-0 h-screen">
        <AdminSidebar nome={profile.nome || user.email || "Admin"} role={profile.role || "admin"} />
      </aside>

      {/* Topbar — mobile */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-[color:var(--color-ink)] text-[color:var(--color-paper)]">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/admin" className="font-mono text-[12px] tracking-tight">
            ARCHÉ · Admin
          </Link>
          <form action="/admin/sair" method="POST">
            <button type="submit" className="text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-paper)]/60">
              Sair
            </button>
          </form>
        </div>
        <div className="px-2 pb-2 bg-[color:var(--color-ink)]">
          <AdminNav dark />
        </div>
      </div>

      <main className="flex-1 min-w-0 px-4 lg:px-10 pt-28 lg:pt-10 pb-20 max-w-[1400px]">
        {children}
      </main>
    </div>
  );
}
// end of AdminLayout
