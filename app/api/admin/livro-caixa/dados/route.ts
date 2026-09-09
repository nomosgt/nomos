import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return Boolean(prof);
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ dados: null });
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("livro_caixa_dados")
    .select("dados, updated_at")
    .eq("id", 1)
    .maybeSingle();
  return NextResponse.json({ dados: data?.dados ?? null, updated_at: data?.updated_at ?? null });
}

export async function PUT(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  let body: { dados?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  if (!body.dados || typeof body.dados !== "object") {
    return NextResponse.json({ error: "dados obrigatorio" }, { status: 422 });
  }
  if (JSON.stringify(body.dados).length > 2_000_000) {
    return NextResponse.json({ error: "Snapshot grande demais" }, { status: 413 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("livro_caixa_dados")
    .upsert({ id: 1, dados: body.dados, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
