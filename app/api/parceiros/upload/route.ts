import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "parceiros";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const TIPOS_OK = [
  "application/pdf",
  "image/png", "image/jpeg", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword", "application/vnd.ms-excel",
  "text/plain", "text/csv", "application/zip",
];

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

/** POST multipart/form-data { file } → sobe pro Storage e devolve o path. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalido" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 15MB" }, { status: 413 });
  }
  if (file.type && !TIPOS_OK.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo nao permitido. Use PDF, imagem, Word, Excel, CSV, TXT ou ZIP." },
      { status: 415 },
    );
  }

  const safeName = file.name.replace(/[^\w.\-()]+/g, "_").slice(0, 120);
  const path = `${ctx.parceiro.id}/${Date.now()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await ctx.admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type || "application/octet-stream" });
  if (error) {
    const hint = error.message.includes("Bucket not found")
      ? "Bucket 'parceiros' nao existe — rode o SQL do financeiro-v3."
      : "Falha no upload.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true, path, nome: file.name });
}
