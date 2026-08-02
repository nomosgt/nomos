import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const createSchema = z.object({
  nome: z.string().min(2).max(120),
  email: z.string().email().max(180),
  telefone: z.string().max(30).optional().or(z.literal("")),
  percentual_padrao: z.number().min(0).max(100).default(10),
  observacoes: z.string().max(600).optional().or(z.literal("")),
  senha: z.string().min(8).max(72).optional().or(z.literal("")),
});

const patchSchema = z.object({
  user_id: z.string().uuid(),
  percentual_padrao: z.number().min(0).max(100).optional(),
  ativo: z.boolean().optional(),
  nome: z.string().min(2).max(120).optional(),
  telefone: z.string().max(30).optional(),
  observacoes: z.string().max(600).optional(),
});

function gerarSenha(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "#" + Math.floor(10 + Math.random() * 90);
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return prof ? u.user : null;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parceiros_profiles")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ colaboradores: data || [] });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const d = parsed.data;

  const admin = createAdminClient();
  const senha = d.senha && d.senha.length >= 8 ? d.senha : gerarSenha();

  // 1) cria user no Auth
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: d.email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: d.nome, papel: "parceiro" },
  });
  if (cErr || !created.user) {
    return NextResponse.json(
      { error: cErr?.message?.includes("already") ? "Ja existe usuario com esse e-mail." : (cErr?.message || "Erro criando usuario") },
      { status: 409 },
    );
  }

  // 2) insere profile
  const { error: pErr } = await admin.from("parceiros_profiles").insert({
    user_id: created.user.id,
    nome: d.nome,
    email: d.email,
    telefone: d.telefone || null,
    percentual_padrao: d.percentual_padrao,
    observacoes: d.observacoes || null,
    ativo: true,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    const hint = pErr.message.includes("does not exist")
      ? " — a tabela parceiros_profiles nao existe. Rode lib/db/colaboradores.sql no Supabase."
      : "";
    return NextResponse.json({ error: pErr.message + hint }, { status: 500 });
  }

  return NextResponse.json({
    user_id: created.user.id,
    email: d.email,
    temp_password: senha,
  });
}

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }
  const { user_id, ...updates } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("parceiros_profiles")
    .update(updates)
    .eq("user_id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id obrigatorio" }, { status: 400 });

  const admin = createAdminClient();
  // remove profile + auth user
  await admin.from("parceiros_profiles").delete().eq("user_id", user_id);
  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
