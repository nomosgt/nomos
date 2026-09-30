import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "case-documents";
const MAX_BYTES = 20 * 1024 * 1024;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return prof ? u.user : null;
}

/** POST multipart { file, case_id, categoria?, visibilidade? } → sobe e registra. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalido" }, { status: 400 });
  }
  const file = form.get("file");
  const caseId = String(form.get("case_id") || "");
  const categoria = String(form.get("categoria") || "geral").slice(0, 40);
  const visibilidade = form.get("visibilidade") === "interno" ? "interno" : "cliente";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 422 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) {
    return NextResponse.json({ error: "case_id invalido" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo acima de 20MB" }, { status: 413 });
  }

  const admin = createAdminClient();
  const { data: caso } = await admin
    .from("client_cases")
    .select("id")
    .eq("id", caseId)
    .maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });

  const safeName = file.name.replace(/[^\w.\-()]+/g, "_").slice(0, 120);
  const path = `${caseId}/${Date.now()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const up = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type || "application/octet-stream" });
  if (up.error) {
    const hint = up.error.message.includes("Bucket not found")
      ? "Bucket 'case-documents' nao existe — rode o SQL do aprovacoes-v4."
      : "Falha no upload.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  const { error: dbErr } = await admin.from("case_documents").insert({
    case_id: caseId,
    uploaded_by: adminUser.id,
    nome: file.name,
    storage_path: path,
    tipo_mime: file.type || null,
    tamanho_bytes: file.size,
    categoria,
    visibilidade,
  });
  if (dbErr) {
    return NextResponse.json({ error: "Arquivo subiu mas falhou o registro" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, path });
}
