import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * Central do Parceiro · Prazos e Checklists do próprio colaborador.
 * GET   → { deadline, checklists:[{...,itens:[...]}] }
 * PATCH { item_id, feito } → marca/desmarca item
 * PATCH { item_id, anexo_path, anexo_nome } → anexa arquivo já enviado
 *       (upload via /api/parceiros/upload; path precisa ser da própria pasta)
 */

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("parceiros_codigos")
    .select("id, nome, ativo")
    .eq("cookie_hash", m[1])
    .maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiro: data };
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const [dl, cls, atr] = await Promise.all([
    ctx.admin
      .from("parceiro_deadlines")
      .select("titulo, prazo, updated_at")
      .eq("parceiro_id", ctx.parceiro.id)
      .maybeSingle(),
    ctx.admin
      .from("parceiro_checklists")
      .select("id, titulo, criado_em, parceiro_checklist_itens ( id, ordem, texto, feito, feito_em, anexo_path, anexo_nome )")
      .eq("parceiro_id", ctx.parceiro.id)
      .order("criado_em", { ascending: false }),
    ctx.admin
      .from("parceiro_clientes")
      .select("client_id, client_profiles!inner ( nome, empresa )")
      .eq("parceiro_id", ctx.parceiro.id),
  ]);
  if (dl.error && dl.error.message.includes("does not exist")) {
    // tabelas ainda não criadas — área simplesmente não aparece
    return NextResponse.json({ deadline: null, checklists: [], clientes: [] });
  }
  const checklists = (cls.data ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    criado_em: c.criado_em,
    itens: (c.parceiro_checklist_itens ?? []).sort((a, b) => a.ordem - b.ordem),
  }));
  const clientes = (atr.data ?? []).map((a) => {
    const p = a.client_profiles as unknown as { nome: string; empresa: string | null } | null;
    return { user_id: a.client_id, nome: p?.nome ?? "Cliente", empresa: p?.empresa ?? null };
  });
  return NextResponse.json({ deadline: dl.data ?? null, checklists, clientes });
}

const patchSchema = z.union([
  z.object({ item_id: z.string().uuid(), feito: z.boolean() }),
  z.object({
    item_id: z.string().uuid(),
    anexo_path: z.string().regex(/^[0-9a-f-]{36}\/[\w.\-()]+$/i),
    anexo_nome: z.string().min(1).max(200),
  }),
]);

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  // o item precisa pertencer a um checklist DESTE colaborador
  const { data: item } = await ctx.admin
    .from("parceiro_checklist_itens")
    .select("id, checklist_id, parceiro_checklists!inner ( parceiro_id )")
    .eq("id", parsed.data.item_id)
    .maybeSingle();
  const dono = (item?.parceiro_checklists as unknown as { parceiro_id: string } | null)?.parceiro_id;
  if (!item || dono !== ctx.parceiro.id) {
    return NextResponse.json({ error: "Item nao encontrado" }, { status: 404 });
  }

  if ("feito" in parsed.data) {
    const { error } = await ctx.admin
      .from("parceiro_checklist_itens")
      .update({ feito: parsed.data.feito, feito_em: parsed.data.feito ? new Date().toISOString() : null })
      .eq("id", parsed.data.item_id);
    if (error) return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // anexo: path precisa ser da própria pasta do colaborador
  if (!parsed.data.anexo_path.startsWith(ctx.parceiro.id + "/")) {
    return NextResponse.json({ error: "Anexo invalido" }, { status: 403 });
  }
  const { error } = await ctx.admin
    .from("parceiro_checklist_itens")
    .update({ anexo_path: parsed.data.anexo_path, anexo_nome: parsed.data.anexo_nome.slice(0, 200) })
    .eq("id", parsed.data.item_id);
  if (error) return NextResponse.json({ error: "Falha ao anexar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
