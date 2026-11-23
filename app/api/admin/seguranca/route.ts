import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";
import { randomInt } from "crypto";

export const runtime = "nodejs";

/** Admin · Token financeiro antifraude — gera/rotaciona o token de um cliente. */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id, nome").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: (prof as { nome?: string }).nome || "Admin" } : null;
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const clientId = new URL(req.url).searchParams.get("client_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return NextResponse.json({ error: "client_id invalido" }, { status: 422 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("client_tokens").select("token, gerado_em, gerado_por").eq("client_id", clientId).maybeSingle();
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return NextResponse.json({ error: "Rode o SQL do central-v26 no Supabase." }, { status: 503 });
    }
    return NextResponse.json({ error: "Falha ao carregar" }, { status: 500 });
  }
  return NextResponse.json({ token: data?.token ?? null, gerado_em: data?.gerado_em ?? null, gerado_por: data?.gerado_por ?? null });
}

const postSchema = z.object({ client_id: z.string().uuid() });

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: cli } = await admin.from("client_profiles").select("user_id").eq("user_id", parsed.data.client_id).maybeSingle();
  if (!cli) return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });

  const token = String(randomInt(100000, 999999)); // 6 dígitos, gerado com CSPRNG
  const { error } = await admin.from("client_tokens").upsert({
    client_id: parsed.data.client_id,
    token,
    gerado_em: new Date().toISOString(),
    gerado_por: adminUser.nome,
  });
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return NextResponse.json({ error: "Rode o SQL do central-v26 no Supabase." }, { status: 503 });
    }
    return NextResponse.json({ error: "Falha ao gerar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, token });
}
