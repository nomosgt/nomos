import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

/**
 * Admin · Base de empresas pesquisadas (embasamento).
 * Lê o histórico de consultas de CNPJ (cnpj_lookups) — a base cresce
 * organicamente a cada empresa que você traça. Só campos de nível de
 * EMPRESA (sem índice de pessoas/sócios). GET ?q= filtra.
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

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cnpj_lookups")
    .select("cnpj, razao_social, nome_fantasia, cnae_principal, cnae_descricao, porte, municipio, uf, perfil_tributario_sugerido, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) {
    return NextResponse.json({ empresas: [], aviso: "Histórico indisponível." });
  }

  // dedup por CNPJ (mantém a consulta mais recente)
  const vistos = new Set<string>();
  let empresas = (data ?? []).filter((e) => {
    if (!e.cnpj || vistos.has(e.cnpj)) return false;
    vistos.add(e.cnpj);
    return true;
  });

  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (q) {
    empresas = empresas.filter((e) => {
      const blob = [e.razao_social, e.nome_fantasia, e.cnpj, e.cnae_descricao, e.municipio, e.uf]
        .join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return blob.includes(q);
    });
  }
  return NextResponse.json({ empresas });
}
