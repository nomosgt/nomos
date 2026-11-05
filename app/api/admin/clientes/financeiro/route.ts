import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const TIPOS = ["potencial", "apurado", "compensacao", "recuperado", "honorarios", "ajuste"] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id, nome").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: (prof as { nome?: string }).nome || "Admin" } : null;
}

/** GET ?case_id= → lançamentos + totais por estágio (estágios NÃO são somados entre si). */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const caseId = new URL(req.url).searchParams.get("case_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) return NextResponse.json({ error: "case_id invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("case_financeiro")
    .select("id, tipo, valor, data_referencia, descricao, justificativa, autor_nome, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) {
    const falta = /does not exist|schema cache|relation/i.test(error.message);
    return NextResponse.json({ error: falta ? "Rode o SQL do financeiro-v18 no Supabase." : "Falha ao listar" }, { status: falta ? 503 : 500 });
  }

  const totais: Record<string, number> = {};
  for (const t of TIPOS) totais[t] = 0;
  for (const l of data ?? []) totais[l.tipo as string] += Number(l.valor);
  // "ajuste" é um delta aplicável a qualquer estágio via descrição; não entra em nenhum total de estágio automaticamente
  return NextResponse.json({ lancamentos: data ?? [], totais });
}

const postSchema = z.object({
  case_id: z.string().uuid(),
  tipo: z.enum(TIPOS),
  valor: z.union([z.number(), z.string()]),
  data_referencia: z.string().optional().nullable(),
  descricao: z.string().max(500).optional().nullable(),
  justificativa: z.string().max(500).optional().nullable(),
});

/** POST → registra um lançamento (imutável; correções são novos lançamentos). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const d = parsed.data;

  const valorNum = typeof d.valor === "number" ? d.valor : Number(String(d.valor).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  if (isNaN(valorNum)) return NextResponse.json({ error: "Valor inválido" }, { status: 422 });
  if (d.tipo === "ajuste" && !(d.justificativa || "").trim()) {
    return NextResponse.json({ error: "Ajuste exige justificativa." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: caso } = await admin.from("client_cases").select("id, client_id").eq("id", d.case_id).maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });

  const { error } = await admin.from("case_financeiro").insert({
    case_id: d.case_id,
    client_id: caso.client_id,
    tipo: d.tipo,
    valor: valorNum,
    data_referencia: d.data_referencia || null,
    descricao: d.descricao || null,
    justificativa: d.justificativa || null,
    autor: adminUser.id,
    autor_nome: adminUser.nome,
  });
  if (error) {
    const falta = /does not exist|schema cache|relation/i.test(error.message);
    return NextResponse.json({ error: falta ? "Rode o SQL do financeiro-v18 no Supabase." : "Falha ao lançar" }, { status: falta ? 503 : 500 });
  }
  return NextResponse.json({ ok: true });
}

const syncSchema = z.object({ case_id: z.string().uuid(), acao: z.literal("sincronizar") });

/**
 * PATCH acao=sincronizar — aplica os totais do livro ao caso de forma EXPLÍCITA
 * e auditada: valor_recuperado = Σ recuperado; potencial_estimado = Σ potencial.
 * Não sobrescreve silenciosamente — é uma ação deliberada do admin.
 */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: lanc } = await admin.from("case_financeiro").select("tipo, valor").eq("case_id", parsed.data.case_id);
  const somaRec = (lanc ?? []).filter((l) => l.tipo === "recuperado").reduce((a, l) => a + Number(l.valor), 0);
  const somaPot = (lanc ?? []).filter((l) => l.tipo === "potencial").reduce((a, l) => a + Number(l.valor), 0);

  const { data: caso } = await admin.from("client_cases").select("id, client_id, valor_recuperado, potencial_estimado").eq("id", parsed.data.case_id).maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });

  await admin.from("client_cases").update({ valor_recuperado: somaRec, potencial_estimado: somaPot || null }).eq("id", parsed.data.case_id);
  // registra o ato de sincronização como lançamento de auditoria (tipo ajuste, valor 0)
  await admin.from("case_financeiro").insert({
    case_id: parsed.data.case_id, client_id: caso.client_id, tipo: "ajuste", valor: 0,
    descricao: `Sincronização com o caso: recuperado=${somaRec}, potencial=${somaPot}`,
    justificativa: "Aplicação explícita dos totais do livro ao caso.",
    autor: adminUser.id, autor_nome: adminUser.nome,
  }).then(() => {}, () => {});
  return NextResponse.json({ ok: true, recuperado: somaRec, potencial: somaPot });
}
