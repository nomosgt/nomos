import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data: prof } = await supabase.from("admin_profiles").select("user_id").eq("user_id", u.user.id).maybeSingle();
  return Boolean(prof);
}

/** GET → notificações do admin (não lidas primeiro) + contador. */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ notificacoes: [], naoLidas: 0 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("notificacoes")
    .select("id, evento, titulo, referencia_tipo, referencia_id, lida, created_at")
    .eq("destinatario_tipo", "admin")
    .order("lida", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return NextResponse.json({ notificacoes: [], naoLidas: 0, aviso: /does not exist|relation/i.test(error.message) ? "Rode o SQL do notificacoes-v25." : undefined });
  const naoLidas = (data ?? []).filter((n) => !n.lida).length;
  return NextResponse.json({ notificacoes: data ?? [], naoLidas });
}

const patchSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

/** PATCH { ids } → marca como lidas. */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  await admin.from("notificacoes").update({ lida: true }).in("id", parsed.data.ids).eq("destinatario_tipo", "admin");
  return NextResponse.json({ ok: true });
}
