import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const ESTAGIOS = ["potencial", "apurado", "compensacao", "recuperado", "honorarios"] as const;
const TIPOS = [...ESTAGIOS, "ajuste"] as const;

type Lanc = { tipo: string; valor: number | string; estagio_alvo?: string | null };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id, nome").eq("user_id", u.user.id).maybeSingle();
  return prof ? { id: u.user.id, nome: (prof as { nome?: string }).nome || "Admin" } : null;
}

/** Totais por estágio: entradas do estágio + ajustes (delta) direcionados a ele. Estágios não se somam entre si. */
function calcularTotais(lancs: Lanc[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const e of ESTAGIOS) t[e] = 0;
  t.ajuste = 0;
  for (const l of lancs) {
    const v = Number(l.valor);
    if (l.tipo === "ajuste") {
      t.ajuste += v;
      if (l.estagio_alvo && ESTAGIOS.includes(l.estagio_alvo as typeof ESTAGIOS[number])) t[l.estagio_alvo] += v; // corrige o estágio
    } else if (ESTAGIOS.includes(l.tipo as typeof ESTAGIOS[number])) {
      t[l.tipo] += v;
    }
  }
  return t;
}

/**
 * Sincroniza o caso e o cliente a partir do livro (recalcula do ZERO — idempotente,
 * sem dupla contagem). valor_recuperado = total recuperado; potencial = total potencial.
 * Roll-up: caixa_recuperado_total do cliente = Σ valor_recuperado dos casos dele.
 * Só mexe em clientes que possuem lançamentos (preserva dados legados dos demais).
 */
async function sincronizar(admin: ReturnType<typeof createAdminClient>, caseId: string) {
  const { data: caso } = await admin.from("client_cases").select("id, client_id").eq("id", caseId).maybeSingle();
  if (!caso) return;
  const { data: lancs } = await admin.from("case_financeiro").select("tipo, valor, estagio_alvo").eq("case_id", caseId);
  const t = calcularTotais((lancs ?? []) as Lanc[]);
  await admin.from("client_cases").update({ valor_recuperado: t.recuperado, potencial_estimado: t.potencial || null }).eq("id", caseId);

  // roll-up para o cliente: soma o valor_recuperado de todos os casos dele
  const { data: casos } = await admin.from("client_cases").select("valor_recuperado").eq("client_id", caso.client_id);
  const totalCliente = (casos ?? []).reduce((a, c) => a + Number(c.valor_recuperado || 0), 0);
  await admin.from("client_profiles").update({ caixa_recuperado_total: totalCliente }).eq("user_id", caso.client_id);
  return { recuperado: t.recuperado, potencial: t.potencial, totalCliente };
}

/** GET ?case_id= → lançamentos + totais por estágio (ajustes já aplicados ao estágio alvo). */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const caseId = new URL(req.url).searchParams.get("case_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) return NextResponse.json({ error: "case_id invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("case_financeiro")
    .select("id, tipo, estagio_alvo, valor, data_referencia, descricao, justificativa, autor_nome, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) {
    const falta = /does not exist|schema cache|relation/i.test(error.message);
    return NextResponse.json({ error: falta ? "Rode o SQL do financeiro-v18/v19 no Supabase." : "Falha ao listar" }, { status: falta ? 503 : 500 });
  }
  return NextResponse.json({ lancamentos: data ?? [], totais: calcularTotais((data ?? []) as Lanc[]) });
}

const postSchema = z.object({
  case_id: z.string().uuid(),
  tipo: z.enum(TIPOS),
  valor: z.union([z.number(), z.string()]),
  estagio_alvo: z.enum(ESTAGIOS).optional().nullable(),
  data_referencia: z.string().optional().nullable(),
  descricao: z.string().max(500).optional().nullable(),
  justificativa: z.string().max(500).optional().nullable(),
});

/** POST → registra um lançamento (imutável) e sincroniza caso + cliente automaticamente. */
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
  if (d.tipo === "ajuste") {
    if (!(d.justificativa || "").trim()) return NextResponse.json({ error: "Ajuste exige justificativa." }, { status: 422 });
    if (!d.estagio_alvo) return NextResponse.json({ error: "Ajuste exige o estágio que está sendo corrigido." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: caso } = await admin.from("client_cases").select("id, client_id, titulo").eq("id", d.case_id).maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });

  const { error } = await admin.from("case_financeiro").insert({
    case_id: d.case_id,
    client_id: caso.client_id,
    case_titulo: caso.titulo,                    // snapshot (sobrevive à exclusão do caso)
    tipo: d.tipo,
    estagio_alvo: d.tipo === "ajuste" ? d.estagio_alvo : null,
    valor: valorNum,
    data_referencia: d.data_referencia || null,
    descricao: d.descricao || null,
    justificativa: d.justificativa || null,
    autor: adminUser.id,
    autor_nome: adminUser.nome,
  });
  if (error) {
    const falta = /does not exist|schema cache|relation|estagio_alvo|case_titulo/i.test(error.message);
    return NextResponse.json({ error: falta ? "Rode o SQL do financeiro-v18/v19 no Supabase." : "Falha ao lançar" }, { status: falta ? 503 : 500 });
  }

  const sync = await sincronizar(admin, d.case_id);   // sincronização AUTOMÁTICA e idempotente
  return NextResponse.json({ ok: true, ...sync });
}

const syncSchema = z.object({ case_id: z.string().uuid(), acao: z.literal("sincronizar") });

/** PATCH acao=sincronizar — reconciliação forçada (mesma lógica idempotente do POST). */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const sync = await sincronizar(admin, parsed.data.case_id);
  if (!sync) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, ...sync });
}
