import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  publicado: { label: "Publicado", color: "bg-emerald-100 text-emerald-800" },
  rascunho: { label: "Rascunho", color: "bg-amber-100 text-amber-800" },
  arquivado: { label: "Arquivado", color: "bg-gray-200 text-gray-700" },
};

export default async function AdminBlog() {
  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, categoria, status, updated_at, published_at, author")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
            Blog
          </h1>
          <p className="text-[14px] text-[color:var(--color-ink-muted)]">
            {posts?.length || 0} post{(posts?.length || 0) !== 1 ? "s" : ""} no banco.
          </p>
        </div>
        <Link
          href="/admin/blog/novo"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[12px] font-mono uppercase tracking-[0.2em] hover:-translate-y-0.5 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo post
        </Link>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-4 text-[13px] text-red-800">
          Erro: {error.message}
        </div>
      )}

      {posts && posts.length > 0 ? (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] text-left">
                <Th>Título</Th>
                <Th>Categoria</Th>
                <Th>Autor</Th>
                <Th>Atualizado</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const s = STATUS_LABEL[p.status] || { label: p.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={p.id} className="border-b border-[color:var(--color-hairline)] last:border-0 hover:bg-[color:var(--color-surface)]">
                    <Td>
                      <Link href={`/admin/blog/${p.id}/editar`} className="font-medium hover:text-[color:var(--color-brand)]">
                        {p.title}
                      </Link>
                      <div className="text-[11px] text-[color:var(--color-ink-faint)] font-mono mt-0.5">
                        /{p.slug}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-[12px]">{p.categoria}</span>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-[color:var(--color-ink-muted)]">{p.author}</span>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-[color:var(--color-ink-muted)]">
                        {new Date(p.updated_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </Td>
                    <Td>
                      <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${s.color}`}>
                        {s.label}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[color:var(--color-hairline)] bg-[color:var(--color-paper)] p-16 text-center text-[14px] text-[color:var(--color-ink-faint)]">
          Nenhum post ainda. Use “Novo post” pra começar.
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-ink-muted)]">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}
