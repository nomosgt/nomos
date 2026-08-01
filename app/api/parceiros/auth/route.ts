import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

/**
 * Auth do Portal de Parceiros v1 — codigo de acesso unico.
 * Define PARCEIROS_SENHA no Vercel pra trocar (default: nomosgt2026).
 * Cookie httpOnly — 7 dias.
 */

function expectedToken(secret: string): string {
  return createHash("sha256").update("ngt-parceiros|" + secret).digest("hex").slice(0, 40);
}

export async function POST(req: Request) {
  let body: { senha?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const senha = (body.senha || "").trim();
  const secret = process.env.PARCEIROS_SENHA || "nomosgt2026";

  if (!senha || senha !== secret) {
    return NextResponse.json(
      { error: "Codigo de acesso incorreto." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("ngt_parceiros", expectedToken(secret), {
    httpOnly: true,
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
  return res;
}
