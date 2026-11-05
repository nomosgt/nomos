import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "case-documents";
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * POST multipart { conteudo?, file? } — o cliente envia uma mensagem, com anexo opcional.
 * O anexo vai para o bucket privado; o download usa /api/sala/documentos/baixar? Não —
 * mensagens têm rota própria de download (GET ?baixar=<id>) validada por posse.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "FormData invalido" }, { status: 400 }); }
  const conteudo = String(form.get("conteudo") || "").trim();
  const file = form.get("file");
  const temArquivo = file instanceof File && file.size > 0;

  if (!conteudo && !temArquivo) return NextResponse.json({ error: "Mensagem vazia" }, { status: 422 });
  if (temArquivo && (file as File).size > MAX_BYTES) return NextResponse.json({ error: "Arquivo acima de 20MB" }, { status: 413 });

  const admin = createAdminClient();
  let anexoPath: string | null = null, anexoNome: string | null = null, anexoMime: string | null = null;
  if (temArquivo) {
    const f = file as File;
    const safe = f.name.replace(/[^\w.\-()]+/g, "_").slice(0, 120);
    anexoPath = `mensagens/${u.user.id}/${Date.now()}-${safe}`;
    const buf = Buffer.from(await f.arrayBuffer());
    const up = await admin.storage.from(BUCKET).upload(anexoPath, buf, { contentType: f.type || "application/octet-stream" });
    if (up.error) return NextResponse.json({ error: "Falha no upload do anexo." }, { status: 500 });
    anexoNome = f.name; anexoMime = f.type || null;
  }

  const { data, error } = await admin.from("case_messages").insert({
    client_id: u.user.id,
    autor_id: u.user.id,
    autor_tipo: "cliente",
    conteudo: conteudo || (anexoNome ? `Enviou um arquivo: ${anexoNome}` : ""),
    anexo_path: anexoPath,
    anexo_nome: anexoNome,
    anexo_mime: anexoMime,
  }).select("id, created_at, conteudo, autor_tipo, lido, anexo_path, anexo_nome").single();
  if (error) {
    const hint = /anexo|column|schema cache/i.test(error.message) ? "Anexos no chat ainda não configurados (mensagens-anexo-v16)." : "Falha ao enviar.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ ok: true, mensagem: data });
}

/** GET ?baixar=<id>&modo= — download do anexo da mensagem, só do próprio cliente. */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const id = sp.get("baixar") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: msg } = await admin.from("case_messages").select("anexo_path, anexo_nome, client_id").eq("id", id).maybeSingle();
  if (!msg || msg.client_id !== u.user.id || !msg.anexo_path) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const modo = sp.get("modo") === "baixar" ? "baixar" : "ver";
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(msg.anexo_path, 600, modo === "baixar" ? { download: msg.anexo_nome || undefined } : undefined);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Erro gerando link" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { status: 303 });
}
