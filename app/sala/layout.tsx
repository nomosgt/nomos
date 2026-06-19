import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SalaNav } from "@/components/sala/sala-nav";

export const metadata: Metadata = {
  title: "Sala NGT",
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
    <div className="min-h-screen bg-[color:var(--color-background)] flex flex-col">
      <header className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-paper)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <Link
              href="/sala"
              className="font-mono text-[13px] tracking-tight text-[color:var(--color-ink)] hover:text-[color:var(--color-brand)]"
            >
              ◇ Sala NGT
            </Link>
            <SalaNav />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[12px] text-[color:var(--color-ink-muted)] hidden sm:block">
              {client.nome}
              {client.empresa && (
                <>
                  {" "}
                  <span className="text-[color:var(--color-ink-faint)]">
                    · {client.empresa}
                  </span>
                </>
              )}
            </div>
            <form action="/sala/sair" method="POST">
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
