import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { BlogPost, Categoria } from "@/lib/validation/blog";
import { POSTS as FALLBACK_POSTS } from "@/components/blog/blog-data";

/**
 * Fonte única do blog público.
 * - Se Supabase configurado: lê só posts com status='publicado' (RLS já filtra).
 * - Se não: usa POSTS hardcoded — mantém site funcional em dev sem backend.
 */

function fallbackPosts(): BlogPost[] {
  return FALLBACK_POSTS.map((p) => ({
    id: p.slug,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body.join("\n\n"),
    categoria: p.categoria as Categoria,
    read_time: p.readTime,
    author: p.author,
    cover: p.cover,
    cover_url: null,
    status: "publicado" as const,
    published_at: new Date(p.date).toISOString(),
    created_at: new Date(p.date).toISOString(),
    updated_at: new Date(p.date).toISOString(),
  }));
}

export async function getAllPublishedPosts(): Promise<BlogPost[]> {
  if (!isSupabaseConfigured()) return fallbackPosts();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "publicado")
      .order("published_at", { ascending: false });
    if (error || !data || data.length === 0) {
      return fallbackPosts();
    }
    return data as BlogPost[];
  } catch (err) {
    console.error("[blog] erro lendo posts:", err);
    return fallbackPosts();
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseConfigured()) {
    return fallbackPosts().find((p) => p.slug === slug) || null;
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "publicado")
      .maybeSingle();
    if (data) return data as BlogPost;
    return fallbackPosts().find((p) => p.slug === slug) || null;
  } catch (err) {
    console.error("[blog] erro lendo post:", err);
    return fallbackPosts().find((p) => p.slug === slug) || null;
  }
}

export async function getRelatedPosts(
  current: BlogPost,
  limit = 3,
): Promise<BlogPost[]> {
  const all = await getAllPublishedPosts();
  const others = all.filter((p) => p.slug !== current.slug);
  const sameCategoria = others.filter(
    (p) => p.categoria === current.categoria,
  );
  const remaining = others.filter((p) => !sameCategoria.includes(p));
  return [...sameCategoria, ...remaining].slice(0, limit);
}
