import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "case-documents";
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Registra um evento na trilha de auditoria de documentos. Tolerante: se a
 * tabela case_document_audit ainda não existir (pré-v13), não quebra a operação.
 */
async function auditar(
  admin: ReturnType<typeof createAdminClient>,
  row: { documento_id?: string | null; case_id?: string | null; nome?: string | null; evento: string; detalhe?: string | null; autor?: string | null },
) {
  try {
    await admin.from("case_document_audit").insert(row);
  } catch {
    /* tabela ausente antes do v13 — ignora */
  }
}

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

/**
 * GET ?case_id= → documentos de um caso (p/ o Éverton gerenciar os já enviados).
 * GET (sem param) → clientes ativos com seus casos (p/ publicar documentos).
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();

  const caseId = new URL(req.url).searchParams.get("case_id");
  if (caseId) {
    if (!/^[0-9a-f-]{36}$/i.test(caseId)) {
      return NextResponse.json({ error: "case_id invalido" }, { status: 422 });
    }
    const incluirArquivados = new URL(req.url).searchParams.get("arquivados") === "1";
    const cols = "id, nome, storage_path, tipo_mime, tamanho_bytes, categoria, visibilidade, created_at, arquivado";
    let q = admin.from("case_documents").select(cols).eq("case_id", caseId).order("created_at", { ascending: false });
    if (!incluirArquivados) q = q.eq("arquivado", false);
    let { data, error } = await q;
    // tolera ambiente anterior ao v13 (sem coluna arquivado)
    if (error && /arquivado|column/i.test(error.message)) {
      const retry = await admin
        .from("case_documents")
        .select("id, nome, storage_path, tipo_mime, tamanho_bytes, categoria, visibilidade, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      data = retry.data as typeof data;
    }
    return NextResponse.json({ documentos: data ?? [] });
  }

  const [clientes, casos] = await Promise.all([
    admin
      .from("client_profiles")
      .select("user_id, nome, empresa")
      .eq("status", "ativo")
      .order("nome"),
    admin
      .from("client_cases")
      .select("id, client_id, titulo, status")
      .neq("status", "arquivado")
      .order("created_at", { ascending: false }),
  ]);

  const porCliente = new Map<string, { id: string; titulo: string; status: string }[]>();
  for (const c of casos.data ?? []) {
    const arr = porCliente.get(c.client_id) ?? [];
    arr.push({ id: c.id, titulo: c.titulo, status: c.status });
    porCliente.set(c.client_id, arr);
  }

  return NextResponse.json({
    clientes: (clientes.data ?? []).map((c) => ({
      user_id: c.user_id,
      nome: c.nome,
      empresa: c.empresa,
      casos: porCliente.get(c.user_id) ?? [],
    })),
  });
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

  const { data: inserido, error: dbErr } = await admin.from("case_documents").insert({
    case_id: caseId,
    uploaded_by: adminUser.id,
    nome: file.name,
    storage_path: path,
    tipo_mime: file.type || null,
    tamanho_bytes: file.size,
    categoria,
    visibilidade,
  }).select("id").single();
  if (dbErr) {
    return NextResponse.json({ error: "Arquivo subiu mas falhou o registro" }, { status: 500 });
  }
  await auditar(admin, { documento_id: inserido?.id, case_id: caseId, nome: file.name, evento: "criado", detalhe: `${visibilidade} · ${categoria}`, autor: adminUser.id });
  return NextResponse.json({ ok: true, path });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1).max(200).optional(),
  visibilidade: z.enum(["cliente", "interno"]).optional(),
  categoria: z.string().max(40).optional(),
});

/** PATCH { id, nome?, visibilidade?, categoria? } → renomeia / muda visibilidade do documento. */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, ...campos } = parsed.data;
  if (Object.keys(campos).length === 0) return NextResponse.json({ error: "Nada a alterar" }, { status: 422 });

  const admin = createAdminClient();
  const { data: antes } = await admin.from("case_documents").select("case_id, nome, visibilidade").eq("id", id).maybeSingle();
  const { error } = await admin.from("case_documents").update(campos).eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });

  if (campos.nome !== undefined && campos.nome !== antes?.nome) {
    await auditar(admin, { documento_id: id, case_id: antes?.case_id, nome: campos.nome, evento: "renomeado", detalhe: `de "${antes?.nome ?? "?"}"`, autor: adminUser.id });
  }
  if (campos.visibilidade !== undefined && campos.visibilidade !== antes?.visibilidade) {
    await auditar(admin, { documento_id: id, case_id: antes?.case_id, nome: antes?.nome, evento: "visibilidade", detalhe: `${antes?.visibilidade ?? "?"} → ${campos.visibilidade}`, autor: adminUser.id });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE ?id=        → ARQUIVA o documento (exclusão lógica: some das listas,
 *                       mas o arquivo e o histórico são preservados).
 * DELETE ?id=&hard=1 → exclusão física definitiva (remove do Storage + registro).
 *                       Reservado p/ expurgo intencional; sempre audita antes.
 */
export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const id = sp.get("id") || "";
  const hard = sp.get("hard") === "1";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: doc } = await admin.from("case_documents").select("storage_path, case_id, nome").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento nao encontrado" }, { status: 404 });

  if (hard) {
    // expurgo definitivo — registra ANTES de apagar (trilha sobrevive sem FK)
    await auditar(admin, { documento_id: id, case_id: doc.case_id, nome: doc.nome, evento: "excluido", detalhe: "exclusão física definitiva", autor: adminUser.id });
    if (doc.storage_path) await admin.storage.from(BUCKET).remove([doc.storage_path]).catch(() => {});
    const { error } = await admin.from("case_documents").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 });
    return NextResponse.json({ ok: true, modo: "excluido" });
  }

  // padrão: arquivamento lógico (tolerante a ambiente pré-v13)
  const { error } = await admin
    .from("case_documents")
    .update({ arquivado: true, arquivado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    const faltaColuna = /arquivado|column/i.test(error.message);
    return NextResponse.json(
      { error: faltaColuna ? "Arquivamento indisponível — rode o SQL do auditoria-v13 no Supabase." : "Falha ao arquivar" },
      { status: 500 },
    );
  }
  await auditar(admin, { documento_id: id, case_id: doc.case_id, nome: doc.nome, evento: "arquivado", autor: adminUser.id });
  return NextResponse.json({ ok: true, modo: "arquivado" });
}
