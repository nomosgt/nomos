import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

/** Admin · Reuniões — lista todas; confirma/conclui/cancela (anti-race por status). */

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return prof ? u.user : null;
}

function hintV26(msg: string) {
  return /does not exist|schema cache|relation/i.test(msg) ? "Rode o SQL do central-v26 no Supabase." : null;
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reunioes")
    .select("id, solicitante_tipo, solicitante_nome, titulo, detalhes, data_sugerida, data_confirmada, status, criado_em, client_id, parceiro_id, client_profiles ( nome, empresa ), parceiros_codigos ( nome )")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (error) {
    const hint = hintV26(error.message);
    if (hint) return NextResponse.json({ error: hint }, { status: 503 });
    const ref = Math.random().toString(36).slice(2, 10);
    console.error(`[admin/reunioes][${ref}]`, error.message);
    return NextResponse.json({ error: `Falha ao listar. (ref: ${ref})` }, { status: 500 });
  }
  const reunioes = (data ?? []).map((r) => {
    const cp = r.client_profiles as unknown as { nome: string; empresa: string | null } | null;
    const pc = r.parceiros_codigos as unknown as { nome: string } | null;
    return {
      id: r.id, solicitante_tipo: r.solicitante_tipo, titulo: r.titulo, detalhes: r.detalhes,
      data_sugerida: r.data_sugerida, data_confirmada: r.data_confirmada, status: r.status, criado_em: r.criado_em,
      solicitante: r.solicitante_nome || cp?.nome || pc?.nome || "—",
      empresa: cp?.empresa ?? null,
    };
  });
  return NextResponse.json({ reunioes });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["confirmada", "concluida", "cancelada"]),
  data_confirmada: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  const { data: antes } = await admin.from("reunioes").select("id, status").eq("id", parsed.data.id).maybeSingle();
  if (!antes) return NextResponse.json({ error: "Reuniao nao encontrada" }, { status: 404 });

  // transições válidas: solicitada→confirmada|cancelada · confirmada→concluida|cancelada
  const PODE: Record<string, string[]> = {
    solicitada: ["confirmada", "cancelada"],
    confirmada: ["concluida", "cancelada"],
  };
  if (!(PODE[antes.status] || []).includes(parsed.data.status)) {
    return NextResponse.json({ error: `Transição inválida (${antes.status} → ${parsed.data.status}).` }, { status: 409 });
  }

  const { data: upd, error } = await admin
    .from("reunioes")
    .update({
      status: parsed.data.status,
      atualizado_em: new Date().toISOString(),
      ...(parsed.data.status === "confirmada"
        ? { data_confirmada: parsed.data.data_confirmada || new Date().toISOString() }
        : {}),
    })
    .eq("id", parsed.data.id)
    .eq("status", antes.status) // anti-race
    .select("id");
  if (error) return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
  if (!upd || upd.length === 0) return NextResponse.json({ error: "Conflito: a reunião mudou de estado." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
