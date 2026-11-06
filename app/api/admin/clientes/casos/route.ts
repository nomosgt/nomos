import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const BUCKET = "case-documents";

const ETAPA_LABEL = ["—", "Reunião Preliminar", "NDA assinado", "Envios & Habilitação", "Análise Estratégica", "Apresentação Estratégica", "Contrato Assinado", "Em Execução"];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id, nome")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return prof ? { id: u.user.id, nome: (prof as { nome?: string }).nome || "Admin" } : null;
}

const patchSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().min(2).max(240).optional(),
  tese: z.string().max(400).optional().nullable(),
  descricao: z.string().max(4000).optional().nullable(),
  etapa: z.number().int().min(1).max(7).optional(),
  status: z.enum(["em_andamento", "pausado", "concluido", "arquivado"]).optional(),
  proxima_acao: z.string().max(400).optional().nullable(),
  responsavel: z.string().max(200).optional().nullable(),
  periodo_apuracao: z.string().max(200).optional().nullable(),
});
const CAMPOS = ["titulo", "tese", "descricao", "etapa", "status", "proxima_acao", "responsavel", "periodo_apuracao"] as const;

/**
 * PATCH — edita campos do caso com auditoria campo-a-campo. Mudança de etapa
 * publica um evento na timeline do cliente (uma única vez, só quando muda).
 */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase nao configurado" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, ...campos } = parsed.data;

  const admin = createAdminClient();
  // "*" não quebra se responsavel/periodo_apuracao ainda não existirem (pré-v22)
  const { data: antes } = await admin.from("client_cases").select("*").eq("id", id).maybeSingle();
  if (!antes) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });

  // monta só o que mudou
  const updates: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    if (campos[c] !== undefined) {
      const novo = campos[c] === "" ? null : campos[c];
      if (novo !== (antes as Record<string, unknown>)[c]) updates[c] = novo;
    }
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true, semAlteracoes: true });

  const { error } = await admin.from("client_cases").update(updates).eq("id", id);
  if (error) {
    const falta = /responsavel|periodo_apuracao|column|schema cache/i.test(error.message);
    return NextResponse.json({ error: falta ? "Rode o SQL de casos (campos responsavel/periodo) — ver observação." : "Falha ao salvar" }, { status: falta ? 503 : 500 });
  }

  // auditoria (tolerante à ausência da tabela antes do v22)
  try {
    const linhas = Object.keys(updates).map((campo) => ({
      case_id: id, client_id: antes.client_id, campo,
      valor_anterior: (antes as Record<string, unknown>)[campo] != null ? String((antes as Record<string, unknown>)[campo]) : null,
      valor_novo: updates[campo] != null ? String(updates[campo]) : null,
      autor: adminUser.id, autor_nome: adminUser.nome,
    }));
    await admin.from("case_audit").insert(linhas);
  } catch { /* v22 ausente */ }

  // mudança de etapa → evento único na timeline do cliente
  if (updates.etapa !== undefined && updates.etapa !== antes.etapa) {
    const n = Number(updates.etapa);
    await admin.from("case_updates").insert({
      case_id: id,
      titulo: `Etapa atualizada: ${ETAPA_LABEL[n] || `etapa ${n}`}`,
      corpo: `Seu caso avançou para a etapa ${n} de 7.`,
      tipo: "marco",
    }).then(() => {}, () => {});
  }

  return NextResponse.json({ ok: true, alterados: Object.keys(updates) });
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
