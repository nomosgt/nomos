import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const BUCKET = "parceiros";

/**
 * Drive do colaborador — lista e exclui os PRÓPRIOS arquivos no Storage.
 * GET    → [{ path, nome, tamanho, criado_em }]
 * DELETE ?path= → remove (somente dentro da própria pasta).
 */

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("parceiros_codigos")
    .select("id, nome, ativo")
    .eq("cookie_hash", m[1])
    .maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiro: data };
}

/** Nome exibível: remove o prefixo de timestamp "1712345678901-". */
function displayName(name: string): string {
  return name.replace(/^\d{10,}-/, "");
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data, error } = await ctx.admin.storage
    .from(BUCKET)
    .list(ctx.parceiro.id, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  if (error) {
    return NextResponse.json({ arquivos: [], aviso: "Storage indisponivel" });
  }
  const arquivos = (data ?? [])
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => ({
      path: `${ctx.parceiro.id}/${f.name}`,
      nome: displayName(f.name),
      tamanho: (f.metadata as { size?: number } | null)?.size ?? null,
      criado_em: f.created_at ?? null,
    }));
  return NextResponse.json({ arquivos });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const path = new URL(req.url).searchParams.get("path") || "";
  if (!/^[0-9a-f-]{36}\/[\w.\-()]+$/i.test(path) || !path.startsWith(ctx.parceiro.id + "/")) {
    return NextResponse.json({ error: "path invalido" }, { status: 422 });
  }
  const { error } = await ctx.admin.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
