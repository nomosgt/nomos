import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

/**
 * Upload de imagem pra capa de post ou pra inserir no corpo.
 * Bucket: blog-images (público pra leitura, admin pra escrita).
 * Retorna URL pública do arquivo.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 503 });
  }

  // Auth: precisa ser admin
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!prof) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Parse multipart
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Form inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo não permitido: ${file.type}. Use JPG, PNG, WebP, GIF ou SVG.` },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 6 MB.` },
      { status: 413 },
    );
  }

  // Nome do arquivo: blog/{timestamp}-{nome-sanitizado}
  const safeName = file.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  const path = `blog/${Date.now()}-${safeName}`;

  // Upload via service role (bypassa RLS no Storage)
  const admin = createAdminClient();
  const buf = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("blog-images")
    .upload(path, buf, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload-image] erro:", uploadError);
    return NextResponse.json(
      { error: uploadError.message || "Erro fazendo upload" },
      { status: 500 },
    );
  }

  // URL pública (bucket é public)
  const { data: pub } = admin.storage.from("blog-images").getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    url: pub.publicUrl,
    path,
  });
}
