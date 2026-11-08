import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

async function resolveParceiro(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ngt_parceiros=([a-f0-9]{40})/);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("parceiros_codigos").select("id, ativo").eq("cookie_hash", m[1]).maybeSingle();
  if (!data || !data.ativo) return null;
  return { admin, parceiroId: data.id };
}

/** GET → notificações do próprio colaborador. */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ notificacoes: [], naoLidas: 0 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data, error } = await ctx.admin.from("notificacoes")
    .select("id, evento, titulo, lida, created_at")
    .eq("destinatario_tipo", "parceiro")
    .eq("destinatario_id", ctx.parceiroId)
    .order("lida", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ notificacoes: [], naoLidas: 0 });
  return NextResponse.json({ notificacoes: data ?? [], naoLidas: (data ?? []).filter((n) => !n.lida).length });
}

const patchSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) });

/** PATCH { ids } → marca como lidas (só as próprias). */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  const ctx = await resolveParceiro(req);
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  await ctx.admin.from("notificacoes").update({ lida: true })
    .in("id", parsed.data.ids)
    .eq("destinatario_tipo", "parceiro")
    .eq("destinatario_id", ctx.parceiroId);
  return NextResponse.json({ ok: true });
}
