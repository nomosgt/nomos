import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Sala · Segurança financeira (antifraude, como no protótipo):
 * GET  → token financeiro do cliente (se a Arché já gerou)
 * POST → verifica um código informado numa cobrança recebida
 *        (resposta neutra: válido/ inválido, sem vazar o token)
 */

async function requireCliente() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("client_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return prof ? u.user.id : null;
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const clientId = await requireCliente();
  if (!clientId) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("client_tokens").select("token, gerado_em").eq("client_id", clientId).maybeSingle();
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return NextResponse.json({ token: null, aviso: "Recurso ainda não habilitado (v26 pendente)." });
    }
    return NextResponse.json({ error: "Falha ao carregar" }, { status: 500 });
  }
  return NextResponse.json({ token: data?.token ?? null, gerado_em: data?.gerado_em ?? null });
}

const postSchema = z.object({ codigo: z.string().min(4).max(20) });

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const clientId = await requireCliente();
  if (!clientId) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("client_tokens").select("token").eq("client_id", clientId).maybeSingle();
  if (error || !data) return NextResponse.json({ valido: false, motivo: "Nenhum token ativo para a sua conta." });
  return NextResponse.json({ valido: data.token === parsed.data.codigo.trim() });
}
