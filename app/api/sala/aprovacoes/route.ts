import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().uuid(),
  decisao: z.enum(["aprovada", "recusada"]),
  resposta: z.string().max(2000).optional(),
});

/** POST — o cliente decide uma aprovação pendente (apenas as dele). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Indisponivel" }, { status: 503 });
  }
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 422 });

  const admin = createAdminClient();
  // trava: só a aprovação DO cliente logado e ainda pendente
  const { data: apr } = await admin
    .from("client_aprovacoes")
    .select("id, client_id, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!apr || apr.client_id !== u.user.id) {
    return NextResponse.json({ error: "Aprovação não encontrada" }, { status: 404 });
  }
  if (apr.status !== "pendente") {
    return NextResponse.json({ error: "Esta solicitação já foi respondida" }, { status: 409 });
  }

  const { error } = await admin
    .from("client_aprovacoes")
    .update({
      status: parsed.data.decisao,
      resposta: parsed.data.resposta || null,
      respondido_em: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Falha ao registrar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
