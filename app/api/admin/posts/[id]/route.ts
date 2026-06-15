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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const r = await requireAdmin();
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const { id } = await ctx.params;
  const { data, error } = await r.supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ post: data });
}

export async function PUT(req: Request, ctx: Ctx) {
  const r = await requireAdmin();
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = blogPostSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;
  const payload = {
    ...data,
    published_at:
      data.status === "publicado" && !data.published_at
        ? new Date().toISOString()
        : data.published_at,
  };
  const { error } = await r.supabase
    .from("blog_posts")
    .update(payload)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug já está em uso." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const r = await requireAdmin();
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const { id } = await ctx.params;
  const { error } = await r.supabase.from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
