import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const BUCKET = "parceiros";

/**
 * Admin · Arquivos dos colaboradores — visão TOTAL.
 * GET → [{ parceiro_id, nome, codigo, ativo, arquivos: [...] }]
 * Abre/baixa via /api/parceiros/arquivo (admin já autorizado lá).
 */

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return Boolean(prof);
}

function displayName(name: string): string {
  return name.replace(/^\d{10,}-/, "");
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: codigos } = await admin
    .from("parceiros_codigos")
    .select("id, nome, codigo, ativo")
    .order("nome");

  const parceiros = await Promise.all(
    (codigos ?? []).map(async (p) => {
      const { data } = await admin.storage
        .from(BUCKET)
        .list(p.id, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
      return {
        parceiro_id: p.id,
        nome: p.nome,
        codigo: p.codigo,
        ativo: p.ativo,
        arquivos: (data ?? [])
          .filter((f) => f.name && !f.name.startsWith("."))
          .map((f) => ({
            path: `${p.id}/${f.name}`,
            nome: displayName(f.name),
            tamanho: (f.metadata as { size?: number } | null)?.size ?? null,
            criado_em: f.created_at ?? null,
          })),
      };
    }),
  );

  return NextResponse.json({ parceiros });
}
