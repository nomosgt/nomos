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

/** Garante que a atividade pertence a este parceiro. */
async function atividadeDoParceiro(admin: ReturnType<typeof createAdminClient>, atividadeId: string, parceiroId: string) {
  const { data } = await admin.from("atividades").select("id, titulo, case_id, parceiro_id").eq("id", atividadeId).maybeSingle();
  if (!data || data.parceiro_id !== parceiroId) return null;
  return data;
}

/**
 * GET ?atividade_id=        → anexos (não arquivados) de uma atividade do parceiro.
 * GET ?baixar=<id>&modo=    → URL assinada do anexo, só se pertencer a uma atividade do parceiro.
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const baixarId = sp.get("baixar");
  if (baixarId) {
    if (!/^[0-9a-f-]{36}$/i.test(baixarId)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
    const { data: anexo } = await ctx.admin.from("atividade_anexos").select("storage_path, nome, atividade_id").eq("id", baixarId).maybeSingle();
    if (!anexo) return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 });
    // posse: a atividade do anexo precisa ser deste parceiro
    const dono = await atividadeDoParceiro(ctx.admin, anexo.atividade_id, ctx.parceiro.id);
    if (!dono) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    const modo = sp.get("modo") === "baixar" ? "baixar" : "ver";
    const { data, error } = await ctx.admin.storage.from(BUCKET).createSignedUrl(anexo.storage_path, 600, modo === "baixar" ? { download: anexo.nome } : undefined);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "Erro gerando link" }, { status: 500 });
    return NextResponse.redirect(data.signedUrl, { status: 303 });
  }

  const atividadeId = sp.get("atividade_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(atividadeId)) return NextResponse.json({ error: "atividade_id invalido" }, { status: 422 });
  if (!(await atividadeDoParceiro(ctx.admin, atividadeId, ctx.parceiro.id))) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const { data, error } = await ctx.admin
    .from("atividade_anexos")
    .select("id, nome, storage_path, tipo_mime, tamanho_bytes, visibilidade, uploader_tipo, uploader_nome, created_at")
    .eq("atividade_id", atividadeId)
    .eq("arquivado", false)
    .order("created_at", { ascending: false });
  if (error && /does not exist|schema cache/i.test(error.message)) return NextResponse.json({ anexos: [] });
  return NextResponse.json({ anexos: data ?? [] });
}

/** POST multipart { file, atividade_id, visibilidade } → sobe anexo numa atividade do parceiro. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "FormData invalido" }, { status: 400 }); }
  const file = form.get("file");
  const atividadeId = String(form.get("atividade_id") || "");
  const visibilidade = form.get("visibilidade") === "cliente" ? "cliente" : "interno";

  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 422 });
  if (!/^[0-9a-f-]{36}$/i.test(atividadeId)) return NextResponse.json({ error: "atividade_id invalido" }, { status: 422 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo acima de 20MB" }, { status: 413 });

  const ativ = await atividadeDoParceiro(ctx.admin, atividadeId, ctx.parceiro.id);
  if (!ativ) return NextResponse.json({ error: "Atividade nao encontrada" }, { status: 404 });

  const safeName = file.name.replace(/[^\w.\-()]+/g, "_").slice(0, 120);
  const path = `atividade/${atividadeId}/${Date.now()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const up = await ctx.admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type || "application/octet-stream" });
  if (up.error) return NextResponse.json({ error: "Falha no upload." }, { status: 500 });

  // 1) registro-fonte primeiro
  const { data: anexo, error: anexoErr } = await ctx.admin.from("atividade_anexos").insert({
    atividade_id: atividadeId,
    nome: file.name,
    storage_path: path,
    tipo_mime: file.type || null,
    tamanho_bytes: file.size,
    visibilidade,
    uploader_tipo: "parceiro",
    uploader_id: ctx.parceiro.id,
    uploader_nome: ctx.parceiro.nome,
  }).select("id").single();
  if (anexoErr) {
    await ctx.admin.storage.from(BUCKET).remove([path]).catch(() => {});
    const hint = /does not exist|schema cache/i.test(anexoErr.message) ? "Anexos ainda não configurados no banco (anexos-v14)." : "Anexo subiu mas falhou o registro.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  // 2) espelho + aviso único (visível ao cliente e com caso)
  let espelhado = false;
  if (visibilidade === "cliente" && ativ.case_id) {
    const { data: docRow, error: docErr } = await ctx.admin.from("case_documents").insert({
      case_id: ativ.case_id,
      uploaded_by: null,
      nome: file.name,
      storage_path: path,
      tipo_mime: file.type || null,
      tamanho_bytes: file.size,
      categoria: "atividade",
      visibilidade: "cliente",
      atividade_id: atividadeId,
    }).select("id").single();
    if (!docErr && docRow) {
      await ctx.admin.from("atividade_anexos").update({ case_document_id: docRow.id }).eq("id", anexo.id);
      await ctx.admin.from("case_updates").insert({
        case_id: ativ.case_id,
        titulo: `Novo documento: ${file.name}`,
        corpo: "Um novo arquivo foi disponibilizado pela equipe Arché. Veja em Documentos.",
        tipo: "info",
      });
      espelhado = true;
    }
  }

  await ctx.admin.from("atividade_historico").insert({ atividade_id: atividadeId, evento: `Anexo adicionado: ${file.name} (${visibilidade})`, autor: ctx.parceiro.nome });
  return NextResponse.json({ ok: true, id: anexo.id, espelhado });
}

/** DELETE ?id= → arquiva um anexo de atividade do parceiro (espelho arquivado junto). */
export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });

  const { data: anexo } = await ctx.admin.from("atividade_anexos").select("id, case_document_id, atividade_id, nome").eq("id", id).maybeSingle();
  if (!anexo) return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 });
  if (!(await atividadeDoParceiro(ctx.admin, anexo.atividade_id, ctx.parceiro.id))) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await ctx.admin.from("atividade_anexos").update({ arquivado: true, arquivado_em: new Date().toISOString() }).eq("id", id);
  if (anexo.case_document_id) {
    await ctx.admin.from("case_documents").update({ arquivado: true, arquivado_em: new Date().toISOString() }).eq("id", anexo.case_document_id);
  }
  await ctx.admin.from("atividade_historico").insert({ atividade_id: anexo.atividade_id, evento: `Anexo arquivado: ${anexo.nome}`, autor: ctx.parceiro.nome });
  return NextResponse.json({ ok: true, modo: "arquivado" });
}
