import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

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

/** GET ?client_id= → aprovações do cliente (ou todas, sem filtro). */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ aprovacoes: [] });
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");
  const admin = createAdminClient();
  let q = admin
    .from("client_aprovacoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  return NextResponse.json({ aprovacoes: data ?? [] });
}

const postSchema = z.object({
  client_id: z.string().uuid(),
  case_id: z.string().uuid().nullable().optional(),
  titulo: z.string().min(3).max(200),
  corpo: z.string().min(3).max(4000),
});

/** POST — admin envia uma questão para aprovação do cliente. */
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
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { error } = await admin.from("client_aprovacoes").insert({
    client_id: parsed.data.client_id,
    case_id: parsed.data.case_id ?? null,
    origem: "admin",
    origem_nome: "Equipe Arché",
    titulo: parsed.data.titulo,
    corpo: parsed.data.corpo,
  });
  if (error) {
    const hint = error.message.includes("does not exist")
      ? "Tabela client_aprovacoes nao existe — rode o SQL do aprovacoes-v4."
      : "Falha ao enviar.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
