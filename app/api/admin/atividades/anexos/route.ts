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
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return prof ? u.user : null;
}

/**
 * GET ?atividade_id=        → anexos (não arquivados) da atividade.
 * GET ?baixar=<id>&modo=ver → redireciona para URL assinada do anexo (abrir/baixar).
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const baixarId = sp.get("baixar");
  if (baixarId) {
    if (!/^[0-9a-f-]{36}$/i.test(baixarId)) return NextResponse.json({ error: "id invalido" }, { status: 422 });
    const admin = createAdminClient();
    const { data: anexo } = await admin.from("atividade_anexos").select("storage_path, nome").eq("id", baixarId).maybeSingle();
    if (!anexo) return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 });
    const modo = sp.get("modo") === "baixar" ? "baixar" : "ver";
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(anexo.storage_path, 600, modo === "baixar" ? { download: anexo.nome } : undefined);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "Erro gerando link" }, { status: 500 });
    return NextResponse.redirect(data.signedUrl, { status: 303 });
  }

  const atividadeId = sp.get("atividade_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(atividadeId)) return NextResponse.json({ error: "atividade_id invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("atividade_anexos")
    .select("id, nome, storage_path, tipo_mime, tamanho_bytes, visibilidade, uploader_tipo, uploader_nome, created_at")
    .eq("atividade_id", atividadeId)
    .eq("arquivado", false)
    .order("created_at", { ascending: false });
  if (error && /does not exist|schema cache/i.test(error.message)) {
    return NextResponse.json({ anexos: [], aviso: "Rode o SQL do anexos-v14 no Supabase." });
  }
  return NextResponse.json({ anexos: data ?? [] });
}

/** POST multipart { file, atividade_id, visibilidade } → sobe o anexo (e espelha em Documentos se visível+com caso). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "FormData invalido" }, { status: 400 }); }
  const file = form.get("file");
  const atividadeId = String(form.get("atividade_id") || "");
  const visibilidade = form.get("visibilidade") === "cliente" ? "cliente" : "interno";

  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 422 });
  if (!/^[0-9a-f-]{36}$/i.test(atividadeId)) return NextResponse.json({ error: "atividade_id invalido" }, { status: 422 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo acima de 20MB" }, { status: 413 });

  const admin = createAdminClient();
  const { data: ativ } = await admin.from("atividades").select("id, titulo, case_id").eq("id", atividadeId).maybeSingle();
  if (!ativ) return NextResponse.json({ error: "Atividade nao encontrada" }, { status: 404 });

  const safeName = file.name.replace(/[^\w.\-()]+/g, "_").slice(0, 120);
  const path = `atividade/${atividadeId}/${Date.now()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const up = await admin.storage.from(BUCKET).upload(path, buf, { contentType: file.type || "application/octet-stream" });
  if (up.error) {
    const hint = up.error.message.includes("Bucket not found") ? "Bucket 'case-documents' nao existe — rode o SQL do aprovacoes-v4." : "Falha no upload.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  // 1) registro-fonte do anexo PRIMEIRO (nunca publica um documento sem este registro existir)
  const { data: anexo, error: anexoErr } = await admin.from("atividade_anexos").insert({
    atividade_id: atividadeId,
    nome: file.name,
    storage_path: path,
    tipo_mime: file.type || null,
    tamanho_bytes: file.size,
    visibilidade,
    uploader_tipo: "admin",
    uploader_id: adminUser.id,
    uploader_nome: "Equipe Arché",
  }).select("id").single();
  if (anexoErr) {
    await admin.storage.from(BUCKET).remove([path]).catch(() => {}); // não deixa blob órfão
    const hint = /does not exist|schema cache/i.test(anexoErr.message) ? "Rode o SQL do anexos-v14 no Supabase." : "Anexo subiu mas falhou o registro.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  // 2) espelho na aba Documentos + aviso ÚNICO ao cliente (só quando visível ao cliente e a atividade tem caso)
  //    Mesmo blob físico (mesmo storage_path) — sem duplicar arquivo. Notificação inserida uma única vez.
  let espelhado = false;
  if (visibilidade === "cliente" && ativ.case_id) {
    const { data: docRow, error: docErr } = await admin.from("case_documents").insert({
      case_id: ativ.case_id,
      uploaded_by: adminUser.id,
      nome: file.name,
      storage_path: path,
      tipo_mime: file.type || null,
      tamanho_bytes: file.size,
      categoria: "atividade",
      visibilidade: "cliente",
      atividade_id: atividadeId,
    }).select("id").single();
    if (!docErr && docRow) {
      await admin.from("atividade_anexos").update({ case_document_id: docRow.id }).eq("id", anexo.id);
      await admin.from("case_updates").insert({
        case_id: ativ.case_id,
        titulo: `Novo documento: ${file.name}`,
        corpo: "Um novo arquivo foi disponibilizado pela equipe Arché. Veja em Documentos.",
        tipo: "info",
      });
      espelhado = true;
    }
  }

  await admin.from("atividade_historico").insert({ atividade_id: atividadeId, evento: `Anexo adicionado: ${file.name} (${visibilidade})`, autor: "admin" });
  return NextResponse.json({ ok: true, id: anexo.id, espelhado });
}

/** DELETE ?id=  → arquiva (padrão). ?id=&hard=1 → remove do Storage + registros. */
export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const id = sp.get("id") || "";
  const hard = sp.get("hard") === "1";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: anexo } = await admin.from("atividade_anexos").select("id, storage_path, case_document_id, atividade_id, nome").eq("id", id).maybeSingle();
  if (!anexo) return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 });

  if (hard) {
    if (anexo.storage_path) await admin.storage.from(BUCKET).remove([anexo.storage_path]).catch(() => {});
    if (anexo.case_document_id) await admin.from("case_documents").delete().eq("id", anexo.case_document_id);
    await admin.from("atividade_anexos").delete().eq("id", id);
    await admin.from("atividade_historico").insert({ atividade_id: anexo.atividade_id, evento: `Anexo excluído: ${anexo.nome}`, autor: "admin" });
    return NextResponse.json({ ok: true, modo: "excluido" });
  }

  await admin.from("atividade_anexos").update({ arquivado: true, arquivado_em: new Date().toISOString() }).eq("id", id);
  // espelho some da aba Documentos junto (arquivamento lógico)
  if (anexo.case_document_id) {
    await admin.from("case_documents").update({ arquivado: true, arquivado_em: new Date().toISOString() }).eq("id", anexo.case_document_id);
  }
  await admin.from("atividade_historico").insert({ atividade_id: anexo.atividade_id, evento: `Anexo arquivado: ${anexo.nome}`, autor: "admin" });
  return NextResponse.json({ ok: true, modo: "arquivado" });
}
