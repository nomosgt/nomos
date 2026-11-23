import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Admin · Deadline dos projetos (tela do protótipo).
 * GET    → casos ativos + datas por etapa + checklist + visibilidade
 * PUT    → { case_id, etapa, data } define/atualiza a data de uma etapa (data vazia remove)
 * PATCH  → { case_id, visivel_cliente } alterna visibilidade no portal
 * POST   → { case_id, titulo } cria pendência documental
 * PATCH  → { checklist_id, concluido } marca/desmarca pendência
 * DELETE → ?checklist_id= remove pendência
 */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return prof ? u.user : null;
}

function v27Ausente(msg: string) {
  return /does not exist|schema cache|relation|column/i.test(msg);
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const admin = createAdminClient();

  // casos: tenta com visivel_cliente (v27); sem a coluna, cai no select antigo
  let casos = await admin
    .from("client_cases")
    .select("id, titulo, tese, status, etapa, prazo:data_estimada_conclusao, visivel_cliente, client_id, client_profiles ( nome, empresa )")
    .neq("status", "arquivado")
    .order("created_at", { ascending: false })
    .limit(200);
  let temV27 = true;
  if (casos.error && v27Ausente(casos.error.message)) {
    temV27 = false;
    casos = (await admin
      .from("client_cases")
      .select("id, titulo, tese, status, etapa, prazo:data_estimada_conclusao, client_id, client_profiles ( nome, empresa )")
      .neq("status", "arquivado")
      .order("created_at", { ascending: false })
      .limit(200)) as typeof casos;
  }
  if (casos.error) {
    const ref = Math.random().toString(36).slice(2, 10);
    console.error(`[admin/deadline][${ref}]`, casos.error.message);
    return NextResponse.json({ error: `Falha ao carregar. (ref: ${ref})` }, { status: 500 });
  }

  const ids = (casos.data ?? []).map((c) => c.id);
  let datas: { case_id: string; etapa: number; data: string }[] = [];
  let checklist: { id: string; case_id: string; titulo: string; concluido: boolean }[] = [];
  if (temV27 && ids.length) {
    const [d, k] = await Promise.all([
      admin.from("case_etapa_datas").select("case_id, etapa, data").in("case_id", ids),
      admin.from("case_checklist").select("id, case_id, titulo, concluido").in("case_id", ids).order("criado_em"),
    ]);
    if (!d.error) datas = d.data ?? [];
    else if (!v27Ausente(d.error.message)) return NextResponse.json({ error: "Falha nas etapas" }, { status: 500 });
    else temV27 = false;
    if (!k.error) checklist = k.data ?? [];
  }

  const resposta = (casos.data ?? []).map((c) => {
    const cp = c.client_profiles as unknown as { nome: string; empresa: string | null } | null;
    return {
      id: c.id,
      titulo: c.titulo,
      tese: c.tese,
      status: c.status,
      etapa: c.etapa,
      prazo: (c as { prazo?: string | null }).prazo ?? null,
      visivel_cliente: temV27 ? ((c as { visivel_cliente?: boolean }).visivel_cliente ?? true) : true,
      cliente: cp?.empresa || cp?.nome || "—",
      datas: datas.filter((d) => d.case_id === c.id),
      checklist: checklist.filter((k) => k.case_id === c.id),
    };
  });
  return NextResponse.json({ casos: resposta, v27: temV27 });
}

const putSchema = z.object({
  case_id: z.string().uuid(),
  etapa: z.number().int().min(1).max(7),
  data: z.string().nullable(),
});

export async function PUT(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: caso } = await admin.from("client_cases").select("id").eq("id", parsed.data.case_id).maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });

  if (!parsed.data.data) {
    await admin.from("case_etapa_datas").delete().eq("case_id", parsed.data.case_id).eq("etapa", parsed.data.etapa);
    return NextResponse.json({ ok: true });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.data)) {
    return NextResponse.json({ error: "Data invalida (AAAA-MM-DD)" }, { status: 422 });
  }
  const { error } = await admin.from("case_etapa_datas").upsert(
    { case_id: parsed.data.case_id, etapa: parsed.data.etapa, data: parsed.data.data },
    { onConflict: "case_id,etapa" },
  );
  if (error) {
    if (v27Ausente(error.message)) return NextResponse.json({ error: "Rode o SQL do deadline-v27 no Supabase." }, { status: 503 });
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

const patchSchema = z.union([
  z.object({ case_id: z.string().uuid(), visivel_cliente: z.boolean() }),
  z.object({ checklist_id: z.string().uuid(), concluido: z.boolean() }),
]);

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });
  const admin = createAdminClient();

  if ("visivel_cliente" in parsed.data) {
    const { error } = await admin.from("client_cases").update({ visivel_cliente: parsed.data.visivel_cliente }).eq("id", parsed.data.case_id);
    if (error) {
      if (v27Ausente(error.message)) return NextResponse.json({ error: "Rode o SQL do deadline-v27 no Supabase." }, { status: 503 });
      return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
  const { error } = await admin.from("case_checklist").update({
    concluido: parsed.data.concluido,
    concluido_em: parsed.data.concluido ? new Date().toISOString() : null,
  }).eq("id", parsed.data.checklist_id);
  if (error) return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const postSchema = z.object({ case_id: z.string().uuid(), titulo: z.string().min(2).max(240) });

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: caso } = await admin.from("client_cases").select("id").eq("id", parsed.data.case_id).maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso nao encontrado" }, { status: 404 });
  const { error } = await admin.from("case_checklist").insert({ case_id: parsed.data.case_id, titulo: parsed.data.titulo.trim() });
  if (error) {
    if (v27Ausente(error.message)) return NextResponse.json({ error: "Rode o SQL do deadline-v27 no Supabase." }, { status: 503 });
    return NextResponse.json({ error: "Falha ao criar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("checklist_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "checklist_id invalido" }, { status: 422 });
  const admin = createAdminClient();
  const { error } = await admin.from("case_checklist").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao remover" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
