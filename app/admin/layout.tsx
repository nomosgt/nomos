import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminNav } from "@/components/admin/admin-nav";
import { SetupNotice } from "@/components/admin/setup-notice";

export const metadata: Metadata = {
  title: "Admin · NOMOS GT",
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
    <div className="min-h-screen bg-[color:var(--color-background)] flex flex-col">
      <header className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-mono text-[13px] tracking-tight text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)]"
            >
              NGT · Admin
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[12px] text-[color:var(--color-ink-muted)] hidden sm:block">
              {profile.nome || user.email}{" "}
              <span className="text-[color:var(--color-ink-faint)]">
                · {profile.role}
              </span>
            </div>
            <form action="/admin/sair" method="POST">
              <button
                type="submit"
                className="text-[12px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-brand)]"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
// end of AdminLayout
