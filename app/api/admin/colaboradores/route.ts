import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const createSchema = z.object({
  nome: z.string().min(2).max(120),
  percentual: z.number().min(0).max(100).default(10),
  observacoes: z.string().max(600).optional().or(z.literal("")),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  percentual: z.number().min(0).max(100).optional(),
  ativo: z.boolean().optional(),
  nome: z.string().min(2).max(120).optional(),
  observacoes: z.string().max(600).optional(),
});

/** Gera codigo legivel: ARC-XXXXXX (sem caracteres ambiguos). Codigos NGT- antigos continuam validos. */
function gerarCodigo(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "ARC-" + s;
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
    .from("parceiros_codigos")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) {
    const hint = error.message.includes("does not exist")
      ? " — tabela parceiros_codigos nao existe. Rode lib/db/colaboradores.sql no Supabase."
      : "";
    return NextResponse.json({ error: error.message + hint }, { status: 500 });
  }
  return NextResponse.json({ codigos: data || [] });
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
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }
  const d = parsed.data;

  const admin = createAdminClient();

  // tenta ate 5x em caso de colisao de codigo
  for (let i = 0; i < 5; i++) {
    const codigo = gerarCodigo();
    const { data: created, error } = await admin
      .from("parceiros_codigos")
      .insert({
        codigo,
        nome: d.nome,
        percentual: d.percentual,
        observacoes: d.observacoes || null,
        ativo: true,
      })
      .select()
      .single();

    if (!error && created) {
      return NextResponse.json({ codigo: created.codigo, id: created.id });
    }
    if (error && !error.message.includes("duplicate")) {
      const hint = error.message.includes("does not exist")
        ? " — tabela parceiros_codigos nao existe. Rode lib/db/colaboradores.sql no Supabase."
        : "";
      return NextResponse.json({ error: error.message + hint }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Falha ao gerar codigo unico" }, { status: 500 });
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
  const { id, ...updates } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from("parceiros_codigos").update(updates).eq("id", id);
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
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("parceiros_codigos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
