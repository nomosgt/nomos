import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { notificar } from "@/lib/notificacoes";
import { z } from "zod";

export const runtime = "nodejs";

/** Admin · Indicações de parceiros — lista e move o funil (anti-race). */

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
  const { data, error } = await admin
    .from("indicacoes")
    .select("id, parceiro_id, parceiro_nome, empresa, contato_nome, contato_email, contato_telefone, observacao, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) {
      return NextResponse.json({ error: "Rode o SQL do central-v26 no Supabase." }, { status: 503 });
    }
    const ref = Math.random().toString(36).slice(2, 10);
    console.error(`[admin/indicacoes][${ref}]`, error.message);
    return NextResponse.json({ error: `Falha ao listar. (ref: ${ref})` }, { status: 500 });
  }
  return NextResponse.json({ indicacoes: data ?? [] });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["em_contato", "convertida", "descartada"]),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: antes } = await admin.from("indicacoes").select("id, status, parceiro_id, empresa").eq("id", parsed.data.id).maybeSingle();
  if (!antes) return NextResponse.json({ error: "Indicacao nao encontrada" }, { status: 404 });
  if (antes.status === "convertida" || antes.status === "descartada") {
    return NextResponse.json({ error: "Indicação já encerrada." }, { status: 409 });
  }

  const { data: upd, error } = await admin
    .from("indicacoes")
    .update({ status: parsed.data.status, atualizado_em: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("status", antes.status)
    .select("id");
  if (error) return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
  if (!upd || upd.length === 0) return NextResponse.json({ error: "Conflito: a indicação mudou de estado." }, { status: 409 });

  // avisa o parceiro quando a indicação converte (idempotente)
  if (parsed.data.status === "convertida" && antes.parceiro_id) {
    await notificar(admin, {
      destinatario_tipo: "parceiro", destinatario_id: antes.parceiro_id, evento: "indicacao_convertida",
      titulo: `Sua indicação virou cliente: ${antes.empresa}`,
      referencia_tipo: "indicacao", referencia_id: antes.id,
      dedup_key: `indicacao_convertida:${antes.id}`,
    });
  }
  return NextResponse.json({ ok: true });
}
