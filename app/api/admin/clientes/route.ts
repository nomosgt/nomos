import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  nome: z.string().min(2).max(120),
  email: z.string().email().max(180),
  empresa: z.string().max(120).optional().or(z.literal("")),
  cnpj: z.string().max(20).optional().or(z.literal("")),
  cargo: z.string().max(80).optional().or(z.literal("")),
  telefone: z.string().max(30).optional().or(z.literal("")),
});

function gerarSenha(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "#" + Math.floor(10 + Math.random() * 90);
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });
  }

  // Verifica admin via session
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!prof) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Parse
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const d = parsed.data;

  const admin = createAdminClient();

  // 1) cria user no Supabase Auth com senha temporária e confirma email
  const senha = gerarSenha();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: d.email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: d.nome, empresa: d.empresa || null },
  });
  if (cErr || !created.user) {
    return NextResponse.json(
      { error: cErr?.message?.includes("already") ? "Já existe usuário com esse e-mail." : (cErr?.message || "Erro criando usuário") },
      { status: 409 },
    );
  }

  // 2) insere no client_profiles
  const { error: pErr } = await admin
    .from("client_profiles")
    .insert({
      user_id: created.user.id,
      nome: d.nome,
      empresa: d.empresa || null,
      cnpj: d.cnpj?.replace(/\D/g, "") || null,
      cargo: d.cargo || null,
      telefone: d.telefone || null,
    });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({
    user_id: created.user.id,
    email: d.email,
    temp_password: senha,
  });
}
