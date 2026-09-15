import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const BUCKET = "parceiros";

/**
 * GET ?path=<storage_path> → URL assinada (10 min) para download.
 * Autorizado para: o próprio parceiro dono do arquivo, perfis de
 * supervisão (Dra. Gabriela) e admins logados.
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  if (!/^[0-9a-f-]{36}\/[\w.\-()]+$/i.test(path)) {
    return NextResponse.json({ error: "path invalido" }, { status: 422 });
  }

  const admin = createAdminClient();
  let autorizado = false;

  // 1) parceiro logado (dono) ou supervisor
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (m) {
    const { data: p } = await admin
      .from("parceiros_codigos")
      .select("id, ativo, papel")
      .eq("cookie_hash", m[1])
      .maybeSingle();
    if (p?.ativo && (p.papel === "supervisor" || path.startsWith(p.id + "/"))) {
      autorizado = true;
    }
  }

  // 2) admin logado (Supabase Auth)
  if (!autorizado) {
    const supabase = await createClient();
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: prof } = await supabase
        .from("admin_profiles")
        .select("user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (prof) autorizado = true;
    }
  }

  if (!autorizado) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  // download: true força o navegador a BAIXAR com o nome original
  // (em vez de tentar renderizar e falhar em tipos não suportados)
  const nomeOriginal = path.split("/").pop()?.replace(/^\d+-/, "") || "arquivo";
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 600, { download: nomeOriginal });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Arquivo nao encontrado" }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
