import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Admin · Prazos e Checklists por colaborador.
 * GET    ?parceiro_id= → { deadline, checklists:[{...,itens:[...]}] }
 * PUT    { parceiro_id, deadline: { titulo?, prazo } | null } → define/edita/remove prazo
 * POST   { parceiro_id, titulo, itens: string[] } → cria checklist
 * DELETE ?checklist_id= → remove checklist (e itens em cascata)
 */

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return Boolean(prof);
}

function hintTabela(msg: string) {
  return msg.includes("does not exist")
    ? "Tabelas de tarefas nao configuradas — rode o SQL do tarefas-v7 no Supabase."
    : null;
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const parceiroId = new URL(req.url).searchParams.get("parceiro_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(parceiroId)) {
    return NextResponse.json({ error: "parceiro_id invalido" }, { status: 422 });
  }
  const admin = createAdminClient();
  const [dl, cls] = await Promise.all([
    admin.from("parceiro_deadlines").select("titulo, prazo, updated_at").eq("parceiro_id", parceiroId).maybeSingle(),
    admin
      .from("parceiro_checklists")
      .select("id, titulo, criado_em, parceiro_checklist_itens ( id, ordem, texto, feito, feito_em, anexo_path, anexo_nome )")
      .eq("parceiro_id", parceiroId)
      .order("criado_em", { ascending: false }),
  ]);
  if (dl.error) {
    const hint = hintTabela(dl.error.message);
    if (hint) return NextResponse.json({ error: hint }, { status: 500 });
  }
  const checklists = (cls.data ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    criado_em: c.criado_em,
    itens: (c.parceiro_checklist_itens ?? []).sort((a, b) => a.ordem - b.ordem),
  }));
  return NextResponse.json({ deadline: dl.data ?? null, checklists });
}

const putSchema = z.object({
  parceiro_id: z.string().uuid(),
  deadline: z
    .object({
      titulo: z.string().max(200).optional(),
      prazo: z.string().min(10), // ISO
    })
    .nullable(),
});

export async function PUT(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  if (parsed.data.deadline === null) {
    await admin.from("parceiro_deadlines").delete().eq("parceiro_id", parsed.data.parceiro_id);
    return NextResponse.json({ ok: true, removido: true });
  }
  const prazoISO = new Date(parsed.data.deadline.prazo);
  if (isNaN(prazoISO.getTime())) {
    return NextResponse.json({ error: "Data/hora invalida" }, { status: 422 });
  }
  const { error } = await admin.from("parceiro_deadlines").upsert({
    parceiro_id: parsed.data.parceiro_id,
    titulo: parsed.data.deadline.titulo?.trim() || null,
    prazo: prazoISO.toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: hintTabela(error.message) || "Falha ao salvar prazo" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

const postSchema = z.object({
  parceiro_id: z.string().uuid(),
  titulo: z.string().min(2).max(200),
  itens: z.array(z.string().min(1).max(500)).min(1).max(40),
});

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: cl, error } = await admin
    .from("parceiro_checklists")
    .insert({ parceiro_id: parsed.data.parceiro_id, titulo: parsed.data.titulo.trim() })
    .select("id")
    .single();
  if (error || !cl) {
    return NextResponse.json({ error: hintTabela(error?.message || "") || "Falha ao criar checklist" }, { status: 500 });
  }
  const itens = parsed.data.itens.map((texto, i) => ({
    checklist_id: cl.id,
    ordem: i,
    texto: texto.trim(),
  }));
  const { error: e2 } = await admin.from("parceiro_checklist_itens").insert(itens);
  if (e2) {
    await admin.from("parceiro_checklists").delete().eq("id", cl.id);
    return NextResponse.json({ error: "Falha ao criar itens" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, checklist_id: cl.id });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("checklist_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "checklist_id invalido" }, { status: 422 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("parceiro_checklists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
