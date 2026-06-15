import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { blogPostSchema } from "@/lib/validation/blog";

export const runtime = "nodejs";

async function requireAdmin() {
  if (!isSupabaseConfigured()) return { error: "Supabase não configurado", status: 503 };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Não autenticado", status: 401 };
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!prof) return { error: "Sem permissão", status: 403 };
  return { supabase };
}

export async function GET() {
  const r = await requireAdmin();
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const { data, error } = await r.supabase
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

export async function POST(req: Request) {
  const r = await requireAdmin();
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = blogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;
  // Se virou publicado e não tem published_at, define agora
  const payload = {
    ...data,
    published_at:
      data.status === "publicado" && !data.published_at
        ? new Date().toISOString()
        : data.published_at,
  };
  const { data: row, error } = await r.supabase
    .from("blog_posts")
    .insert(payload)
    .select("id, slug")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Já existe um post com esse slug." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: row.id, slug: row.slug }, { status: 201 });
}
