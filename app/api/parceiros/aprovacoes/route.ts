import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("parceiros_codigos")
    .select("id, nome, ativo, papel")
    .eq("cookie_hash", m[1])
    .maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiro: data };
}

/** GET — clientes disponíveis (id+nome, p/ endereçar) e minhas solicitações. */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const [clientes, minhas] = await Promise.all([
    ctx.admin
      .from("client_profiles")
      .select("user_id, nome, empresa")
      .eq("status", "ativo")
      .order("nome"),
    ctx.admin
      .from("client_aprovacoes")
      .select("id, created_at, titulo, corpo, status, resposta, respondido_em, client_id")
      .eq("parceiro_id", ctx.parceiro.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    clientes: clientes.data ?? [],
    minhas: minhas.data ?? [],
  });
}

const postSchema = z.object({
  client_id: z.string().uuid(),
  titulo: z.string().min(3).max(200),
  corpo: z.string().min(3).max(4000),
});

/** POST — colaborador envia questão para aprovação do cliente. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const { error } = await ctx.admin.from("client_aprovacoes").insert({
    client_id: parsed.data.client_id,
    origem: "parceiro",
    origem_nome: ctx.parceiro.nome,
    parceiro_id: ctx.parceiro.id,
    titulo: parsed.data.titulo,
    corpo: parsed.data.corpo,
  });
  if (error) return NextResponse.json({ error: "Falha ao enviar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
