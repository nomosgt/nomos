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

  const [atr, minhas] = await Promise.all([
    ctx.admin
      .from("parceiro_clientes")
      .select("client_id, client_profiles!inner ( user_id, nome, empresa, status )")
      .eq("parceiro_id", ctx.parceiro.id),
    ctx.admin
      .from("client_aprovacoes")
      .select("id, created_at, titulo, corpo, status, resposta, respondido_em, client_id")
      .eq("parceiro_id", ctx.parceiro.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Clientes endereçáveis = SOMENTE os atribuídos pelo admin a este colaborador.
  // (Se a tabela de atribuições ainda não existir, cai no comportamento antigo.)
  let clientes: { user_id: string; nome: string; empresa: string | null }[];
  if (atr.error && atr.error.message.includes("does not exist")) {
    const todos = await ctx.admin
      .from("client_profiles")
      .select("user_id, nome, empresa")
      .eq("status", "ativo")
      .order("nome");
    clientes = todos.data ?? [];
  } else {
    clientes = (atr.data ?? [])
      .map((a) => a.client_profiles as unknown as { user_id: string; nome: string; empresa: string | null; status: string })
      .filter((c) => c && c.status === "ativo")
      .map((c) => ({ user_id: c.user_id, nome: c.nome, empresa: c.empresa }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  return NextResponse.json({
    clientes,
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
  if (error) {
    const hint = error.message.includes("does not exist")
      ? "Tabela de aprovacoes nao configurada — rode o SQL do aprovacoes-v4 no Supabase."
      : "Falha ao enviar.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
