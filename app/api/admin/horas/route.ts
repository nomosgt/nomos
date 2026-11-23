import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Admin · Horas técnicas — cria estimativas para aprovação do cliente
 * e acompanha o funil (solicitada_cliente → aguardando_aprovacao → aprovada/recusada).
 */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return prof ? u.user : null;
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const admin = createAdminClient();
  const [ests, clientes] = await Promise.all([
    admin
      .from("horas_estimativas")
      .select("id, client_id, titulo, descricao, horas, valor, status, decidido_em, criado_em, client_profiles ( nome, empresa )")
      .order("criado_em", { ascending: false })
      .limit(300),
    admin.from("client_profiles").select("user_id, nome, empresa").order("nome"),
  ]);
  if (ests.error) {
    if (/does not exist|schema cache|relation/i.test(ests.error.message)) {
      return NextResponse.json({ error: "Rode o SQL do central-v26 no Supabase." }, { status: 503 });
    }
    const ref = Math.random().toString(36).slice(2, 10);
    console.error(`[admin/horas][${ref}]`, ests.error.message);
    return NextResponse.json({ error: `Falha ao listar. (ref: ${ref})` }, { status: 500 });
  }
  const estimativas = (ests.data ?? []).map((r) => {
    const cp = r.client_profiles as unknown as { nome: string; empresa: string | null } | null;
    return { ...r, client_profiles: undefined, cliente: cp?.empresa || cp?.nome || "—" };
  });
  return NextResponse.json({ estimativas, clientes: clientes.data ?? [] });
}

const postSchema = z.object({
  client_id: z.string().uuid(),
  titulo: z.string().min(3).max(200),
  descricao: z.string().max(2000).optional().nullable(),
  horas: z.number().positive().max(10000),
  valor: z.number().nonnegative().max(100000000).optional().nullable(),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const d = parsed.data;

  const admin = createAdminClient();
  const { data: cli } = await admin.from("client_profiles").select("user_id").eq("user_id", d.client_id).maybeSingle();
  if (!cli) return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });

  const { error } = await admin.from("horas_estimativas").insert({
    client_id: d.client_id,
    titulo: d.titulo.trim(),
    descricao: d.descricao?.trim() || null,
    horas: d.horas,
    valor: d.valor ?? null,
    status: "aguardando_aprovacao",
  });
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return NextResponse.json({ error: "Rode o SQL do central-v26 no Supabase." }, { status: 503 });
    }
    return NextResponse.json({ error: "Falha ao criar estimativa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** PATCH — responde solicitação do cliente transformando em estimativa, ou cancela. */
const patchSchema = z.object({
  id: z.string().uuid(),
  acao: z.enum(["estimar", "cancelar"]),
  horas: z.number().positive().max(10000).optional(),
  valor: z.number().nonnegative().max(100000000).optional().nullable(),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: antes } = await admin.from("horas_estimativas").select("id, status").eq("id", parsed.data.id).maybeSingle();
  if (!antes) return NextResponse.json({ error: "Estimativa nao encontrada" }, { status: 404 });

  if (parsed.data.acao === "estimar") {
    if (antes.status !== "solicitada_cliente") {
      return NextResponse.json({ error: "Só é possível estimar uma solicitação do cliente." }, { status: 409 });
    }
    if (!parsed.data.horas) return NextResponse.json({ error: "Informe as horas." }, { status: 422 });
    const { data: upd, error } = await admin
      .from("horas_estimativas")
      .update({ status: "aguardando_aprovacao", horas: parsed.data.horas, valor: parsed.data.valor ?? null })
      .eq("id", parsed.data.id)
      .eq("status", "solicitada_cliente")
      .select("id");
    if (error) return NextResponse.json({ error: "Falha ao estimar" }, { status: 500 });
    if (!upd || upd.length === 0) return NextResponse.json({ error: "Conflito de estado." }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  // cancelar — apenas itens ainda não decididos
  if (antes.status === "aprovada" || antes.status === "recusada") {
    return NextResponse.json({ error: "Estimativa já decidida pelo cliente." }, { status: 409 });
  }
  const { data: upd, error } = await admin
    .from("horas_estimativas")
    .update({ status: "cancelada" })
    .eq("id", parsed.data.id)
    .eq("status", antes.status)
    .select("id");
  if (error) return NextResponse.json({ error: "Falha ao cancelar" }, { status: 500 });
  if (!upd || upd.length === 0) return NextResponse.json({ error: "Conflito de estado." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
