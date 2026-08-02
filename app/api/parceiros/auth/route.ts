import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

/**
 * Auth do Portal de Parceiros — codigo individual gerado no admin.
 * POST { codigo } -> valida na tabela parceiros_codigos -> cookie httpOnly 7 dias.
 */

function tokenFor(codigo: string): string {
  const salt = process.env.IP_HASH_SALT || "nomos-gt-default-salt-2026";
  return createHash("sha256").update("ngt-parceiros|" + codigo + "|" + salt).digest("hex").slice(0, 40);
}

export async function POST(req: Request) {
  let body: { codigo?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const codigo = (body.codigo || "").trim().toUpperCase();
  if (!codigo) {
    return NextResponse.json({ error: "Informe o codigo de acesso." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sistema indisponivel no momento." }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("parceiros_codigos")
    .select("id, codigo, nome, ativo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) {
    const hint = error.message.includes("does not exist")
      ? "Tabela de codigos nao configurada. Avise o administrador."
      : "Erro interno. Tente novamente.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  if (!row || !row.ativo) {
    return NextResponse.json({ error: "Codigo invalido ou desativado." }, { status: 401 });
  }

  // registra ultimo acesso (fire-and-forget)
  void admin
    .from("parceiros_codigos")
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  const res = NextResponse.json({ ok: true, nome: row.nome });
  res.cookies.set("ngt_parceiros", tokenFor(row.codigo), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  // nome do colaborador em cookie legivel (pra UI saudar)
  res.cookies.set("ngt_parceiro_nome", encodeURIComponent(row.nome), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("ngt_parceiros", "", { maxAge: 0, path: "/" });
  res.cookies.set("ngt_parceiro_nome", "", { maxAge: 0, path: "/" });
  return res;
}
