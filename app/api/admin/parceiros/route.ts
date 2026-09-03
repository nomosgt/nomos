import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Admin · Central do Parceiro v2.
 * GET   -> todos os parceiros + snapshot de dados + casos de clientes (p/ ponte).
 * PATCH -> { parceiro_id, dados } grava snapshot editado pelo admin
 *          (aprovar demanda, mudar status/valor de comissão etc).
 * POST  -> { case_id, titulo, corpo } publica atualização na Sala do Cliente.
 */

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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const admin = createAdminClient();

  const [codigos, dados, cases] = await Promise.all([
    admin
      .from("parceiros_codigos")
      .select("id, codigo, nome, percentual, ativo, ultimo_acesso, created_at")
      .order("created_at", { ascending: false }),
    admin.from("parceiro_dados").select("parceiro_id, dados, updated_at, updated_by"),
    admin
      .from("client_cases")
      .select("id, titulo, tese, status, client_id, client_profiles(nome, empresa)")
      .neq("status", "arquivado")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const dadosMap = new Map(
    (dados.data ?? []).map((d) => [d.parceiro_id, d]),
  );

  return NextResponse.json({
    parceiros: (codigos.data ?? []).map((p) => ({
      ...p,
      snapshot: dadosMap.get(p.id)?.dados ?? null,
      snapshot_updated_at: dadosMap.get(p.id)?.updated_at ?? null,
      snapshot_updated_by: dadosMap.get(p.id)?.updated_by ?? null,
    })),
    cases: cases.data ?? [],
  });
}

const patchSchema = z.object({
  parceiro_id: z.string().uuid(),
  dados: z.record(z.string(), z.unknown()),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("parceiro_dados").upsert({
    parceiro_id: parsed.data.parceiro_id,
    dados: parsed.data.dados,
    updated_at: new Date().toISOString(),
    updated_by: "admin",
  });
  if (error) return NextResponse.json({ error: "Falha ao gravar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const postSchema = z.object({
  case_id: z.string().uuid(),
  titulo: z.string().min(3).max(200),
  corpo: z.string().min(3).max(4000),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("case_updates").insert({
    case_id: parsed.data.case_id,
    titulo: parsed.data.titulo,
    corpo: parsed.data.corpo,
    tipo: "update",
  });
  if (error) return NextResponse.json({ error: "Falha ao publicar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
