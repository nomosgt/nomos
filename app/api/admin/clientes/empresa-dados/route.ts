import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

const TIPOS = ["faturamento_mensal", "faturamento_anual", "receita_bruta", "receita_liquida", "despesas_operacionais", "custos", "lucro", "outro"] as const;
const ORIGENS = ["declarado", "importado", "calculado", "validado"] as const;

/**
 * Inteligência Empresarial · dados da empresa (faturamento etc.).
 * DOMÍNIO SEPARADO do livro tributário (case_financeiro): editar faturamento
 * NUNCA altera caixa recuperado. Correções exigem justificativa e preservam
 * o valor anterior (empresa_dados_audit).
 */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id, nome").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: (prof as { nome?: string }).nome || "Admin" } : null;
}

function hintV23(msg: string) {
  return /does not exist|schema cache|relation/i.test(msg) ? "Rode o SQL do central-v23 (e v24) no Supabase." : null;
}

/** GET ?client_id= → registros + resumo por tipo (sem somar tipos diferentes). */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const clientId = new URL(req.url).searchParams.get("client_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return NextResponse.json({ error: "client_id invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("empresa_dados")
    .select("id, tipo, periodo, valor, moeda, origem, validado, observacao, autor_nome, created_at")
    .eq("client_id", clientId)
    .order("periodo", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: hintV23(error.message) || "Falha ao listar" }, { status: 503 });

  // resumo: último período informado por tipo (nunca soma tipos/períodos distintos)
  const ultimoPorTipo: Record<string, { periodo: string; valor: number; validado: boolean } | null> = {};
  for (const t of TIPOS) ultimoPorTipo[t] = null;
  for (const r of data ?? []) {
    if (!ultimoPorTipo[r.tipo]) ultimoPorTipo[r.tipo] = { periodo: r.periodo, valor: Number(r.valor), validado: r.validado };
  }
  return NextResponse.json({ registros: data ?? [], ultimoPorTipo });
}

const postSchema = z.object({
  client_id: z.string().uuid(),
  tipo: z.enum(TIPOS),
  periodo: z.string().min(2).max(40),
  valor: z.union([z.number(), z.string()]),
  origem: z.enum(ORIGENS).optional(),
  observacao: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const d = parsed.data;

  let valorNum: number;
  if (typeof d.valor === "number") valorNum = d.valor;
  else { const limpo = String(d.valor).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""); valorNum = /\d/.test(limpo) ? Number(limpo) : NaN; }
  if (isNaN(valorNum)) return NextResponse.json({ error: "Valor inválido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: cli } = await admin.from("client_profiles").select("user_id").eq("user_id", d.client_id).maybeSingle();
  if (!cli) return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });

  // idempotência prática: impede registro idêntico duplicado (mesmo tipo+período+valor)
  const { data: dup } = await admin.from("empresa_dados").select("id").eq("client_id", d.client_id).eq("tipo", d.tipo).eq("periodo", d.periodo.trim()).eq("valor", valorNum).limit(1);
  if (dup && dup.length) return NextResponse.json({ error: "Registro idêntico já existe para este tipo/período." }, { status: 409 });

  const { data: novo, error } = await admin.from("empresa_dados").insert({
    client_id: d.client_id, tipo: d.tipo, periodo: d.periodo.trim(), valor: valorNum,
    origem: d.origem || "declarado", observacao: d.observacao || null,
    autor_tipo: "admin", autor_nome: adminUser.nome,
    validado: d.origem === "validado",   // dado declarado NUNCA nasce validado
  }).select("id").single();
  if (error) return NextResponse.json({ error: hintV23(error.message) || "Falha ao salvar" }, { status: 503 });

  // dado não validado → aviso interno (idempotente por registro)
  if (novo && d.origem !== "validado") {
    await notificar(admin, {
      destinatario_tipo: "admin", evento: "empresa_dado",
      titulo: `Dado empresarial aguardando validação (${d.tipo} · ${d.periodo.trim()})`,
      referencia_tipo: "cliente", referencia_id: d.client_id,
      dedup_key: `empresa_dado:${novo.id}`,
    });
  }
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  valor: z.union([z.number(), z.string()]).optional(),
  periodo: z.string().min(2).max(40).optional(),
  validado: z.boolean().optional(),
  justificativa: z.string().max(500).optional(),
});

/** PATCH — corrige valor/período (justificativa obrigatória; valor anterior preservado) ou valida. */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const { id, justificativa } = parsed.data;

  const admin = createAdminClient();
  const { data: antes } = await admin.from("empresa_dados").select("id, client_id, tipo, periodo, valor, validado").eq("id", id).maybeSingle();
  if (!antes) return NextResponse.json({ error: "Registro nao encontrado" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  const auditoria: { campo: string; de: string; para: string }[] = [];

  if (parsed.data.valor !== undefined) {
    let v: number;
    if (typeof parsed.data.valor === "number") v = parsed.data.valor;
    else { const limpo = String(parsed.data.valor).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""); v = /\d/.test(limpo) ? Number(limpo) : NaN; }
    if (isNaN(v)) return NextResponse.json({ error: "Valor inválido" }, { status: 422 });
    if (v !== Number(antes.valor)) { updates.valor = v; auditoria.push({ campo: "valor", de: String(antes.valor), para: String(v) }); }
  }
  if (parsed.data.periodo !== undefined && parsed.data.periodo.trim() !== antes.periodo) {
    updates.periodo = parsed.data.periodo.trim();
    auditoria.push({ campo: "periodo", de: antes.periodo, para: parsed.data.periodo.trim() });
  }
  if (parsed.data.validado !== undefined && parsed.data.validado !== antes.validado) {
    updates.validado = parsed.data.validado;
    auditoria.push({ campo: "validado", de: String(antes.validado), para: String(parsed.data.validado) });
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true, semAlteracoes: true });

  // correção de valor/período é sensível → justificativa obrigatória
  const sensivel = updates.valor !== undefined || updates.periodo !== undefined;
  if (sensivel && !(justificativa || "").trim()) {
    return NextResponse.json({ error: "Correção de valor/período exige justificativa." }, { status: 422 });
  }

  const { error } = await admin.from("empresa_dados").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });

  try {
    await admin.from("empresa_dados_audit").insert(auditoria.map((a) => ({
      registro_id: id, client_id: antes.client_id, campo: a.campo,
      valor_anterior: a.de, valor_novo: a.para,
      justificativa: justificativa?.trim() || null, autor_nome: adminUser.nome,
    })));
  } catch { /* pré-v24 */ }
  return NextResponse.json({ ok: true });
}
