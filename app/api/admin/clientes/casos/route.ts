import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const BUCKET = "case-documents";

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
 * DELETE ?id= → exclui um caso/oportunidade do cliente.
 * Antes de apagar: remove os arquivos do Storage dos documentos do caso
 * (as linhas em case_documents/case_updates/case_messages caem por cascade;
 *  atividades ficam com case_id = null). Registra na trilha de auditoria.
 */
export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  }
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id invalido" }, { status: 422 });

  const admin = createAdminClient();

  const { data: caso } = await admin
    .from("client_cases")
    .select("id, titulo, client_id")
    .eq("id", id)
    .maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });

  // 1) remover blobs do Storage dos documentos do caso (as linhas caem por cascade)
  const { data: docs } = await admin
    .from("case_documents")
    .select("id, nome, storage_path")
    .eq("case_id", id);
  const paths = (docs ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
  if (paths.length) {
    await admin.storage.from(BUCKET).remove(paths).catch(() => {});
  }

  // 2) trilha de auditoria (tolerante a ambiente pré-v13)
  try {
    const linhas = [
      { documento_id: null as string | null, case_id: id, nome: caso.titulo, evento: "caso_excluido", detalhe: `${paths.length} documento(s) removido(s)`, autor: adminUser.id },
      ...(docs ?? []).map((d) => ({ documento_id: d.id, case_id: id, nome: d.nome, evento: "excluido", detalhe: "caso excluído", autor: adminUser.id })),
    ];
    await admin.from("case_document_audit").insert(linhas);
  } catch { /* sem a tabela de auditoria ainda — segue */ }

  // 3) excluir o caso (cascade cuida de updates/documentos/mensagens; atividades → case_id null)
  const { error } = await admin.from("client_cases").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao excluir o caso" }, { status: 500 });

  return NextResponse.json({ ok: true, documentos_removidos: paths.length });
}
