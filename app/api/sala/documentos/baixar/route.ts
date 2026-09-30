import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "case-documents";

/**
 * Entrega um documento do caso ao cliente logado.
 * - Posse validada via RLS (select em case_documents com a sessão do cliente).
 * - URL assinada gerada com service role (independe de policies de storage).
 * - modo=ver abre inline no navegador; modo=baixar força download.
 */
async function entregar(path: string, modo: "ver" | "baixar", nome?: string) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!path) return NextResponse.json({ error: "Path ausente" }, { status: 400 });

  // RLS garante: só retorna se o doc pertence a um caso do cliente (ou admin).
  const { data: doc } = await supabase
    .from("case_documents")
    .select("id, nome")
    .eq("storage_path", path)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 600, modo === "baixar" ? { download: nome || doc.nome } : undefined);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Erro gerando link" }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl, { status: 303 });
}

export async function POST(req: Request) {
  const form = await req.formData();
  return entregar(
    String(form.get("path") || ""),
    form.get("modo") === "ver" ? "ver" : "baixar",
    String(form.get("nome") || "") || undefined,
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return entregar(
    searchParams.get("path") || "",
    searchParams.get("modo") === "baixar" ? "baixar" : "ver",
  );
}
