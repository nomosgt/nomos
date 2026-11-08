import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "case-documents";
const MAX_BYTES = 20 * 1024 * 1024;

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("parceiros_codigos").select("id, nome, ativo").eq("cookie_hash", m[1]).maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiro: data };
}

async function analiseDoParceiro(admin: ReturnType<typeof createAdminClient>, analiseId: string, parceiroId: string) {
  const { data } = await admin.from("analises").select("id, parceiro_id, status").eq("id", analiseId).maybeSingle();
  if (!data || data.parceiro_id !== parceiroId) return null;
  return data;
}

/** POST multipart { file, analise_id } → anexa evidência (só em rascunho/ajustes). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "FormData invalido" }, { status: 400 }); }
  const file = form.get("file");
  const analiseId = String(form.get("analise_id") || "");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 422 });
  if (!/^[0-9a-f-]{36}$/i.test(analiseId)) return NextResponse.json({ error: "analise_id invalido" }, { status: 422 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo acima de 20MB" }, { status: 413 });

  const analise = await analiseDoParceiro(ctx.admin, analiseId, ctx.parceiro.id);
  if (!analise) return NextResponse.json({ error: "Analise nao encontrada" }, { status: 404 });
  if (analise.status !== "rascunho" && analise.status !== "ajustes_solicitados") {
    return NextResponse.json({ error: "Anexos só em rascunho ou após pedido de ajustes." }, { status: 409 });
  }

  const safe = file.name.replace(/[^\w.\-()]+/g, "_").slice(0, 120);
  const path = `analises/${analiseId}/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const up = await ctx.admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type || "application/octet-stream" });
  if (up.error) return NextResponse.json({ error: "Falha no upload." }, { status: 500 });

  const { error } = await ctx.admin.from("analise_anexos").insert({
    analise_id: analiseId, nome: file.name, storage_path: path,
    tipo_mime: file.type || null, tamanho_bytes: file.size, uploader_nome: ctx.parceiro.nome,
  });
  if (error) {
    await ctx.admin.storage.from(BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ error: "Falha ao registrar o anexo." }, { status: 500 });
  }
  await ctx.admin.from("analise_eventos").insert({ analise_id: analiseId, evento: "anexo", detalhe: file.name, autor: ctx.parceiro.nome }).then(() => {}, () => {});
  return NextResponse.json({ ok: true });
}

/** GET ?baixar=<anexoId> → URL assinada (só de análise própria). */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const id = sp.get("baixar") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });

  const { data: anexo } = await ctx.admin.from("analise_anexos").select("storage_path, nome, analise_id").eq("id", id).maybeSingle();
  if (!anexo) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  if (!(await analiseDoParceiro(ctx.admin, anexo.analise_id, ctx.parceiro.id))) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const modo = sp.get("modo") === "baixar" ? "baixar" : "ver";
  const { data, error } = await ctx.admin.storage.from(BUCKET).createSignedUrl(anexo.storage_path, 600, modo === "baixar" ? { download: anexo.nome } : undefined);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Erro gerando link" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { status: 303 });
}
