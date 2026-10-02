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
  const { data, error } = await admin
    .from("relatorios_dados")
    .select("dados, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error && error.message.includes("does not exist")) {
    // tabela ainda não criada — app segue funcionando só com localStorage
    return NextResponse.json({ dados: null, aviso: "Rode o SQL do relatorios-v5 no Supabase." });
  }
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
  if (JSON.stringify(body.dados).length > 4_000_000) {
    return NextResponse.json({ error: "Snapshot grande demais" }, { status: 413 });
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("relatorios_dados")
    .upsert({ id: 1, dados: body.dados, updated_at: new Date().toISOString() });
  if (error) {
    const hint = error.message.includes("does not exist")
      ? "Tabela de relatorios nao configurada — rode o SQL do relatorios-v5 no Supabase."
      : "Falha ao salvar";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
