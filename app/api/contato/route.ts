import { NextResponse } from "next/server";
import { contatoSchema } from "@/lib/validation/contato";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp, hashIp } from "@/lib/hash";
import { sendEmail, novoContatoTemplate } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // 1) Rate limit por IP — protege contra spam de bot
  const ip = getRequestIp(req);
  const ipHash = hashIp(ip);
  const rateKey = ipHash || "anon";
  const { success } = await checkRateLimit(`contato:${rateKey}`);
  if (!success) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um minuto e tente de novo." },
      { status: 429 },
    );
  }

  // 2) Parse + validação Zod
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = contatoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // 3) Honeypot — se preenchido, é bot. Retorna 200 fingindo sucesso pra não denunciar.
  if (data.honeypot && data.honeypot.length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 4) Persist via service role (bypassa RLS — o INSERT já é público mas service role
  //    é mais resiliente caso policy mude no futuro)
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("[api/contato] Supabase não configurado:", e);
    return NextResponse.json(
      { error: "Servidor de armazenamento não configurado." },
      { status: 503 },
    );
  }

  const { data: row, error } = await supabase
    .from("contact_submissions")
    .insert({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone || null,
      empresa: data.empresa || null,
      cargo: data.cargo || null,
      faturamento_estimado: data.faturamento_estimado || null,
      mensagem: data.mensagem || null,
      origem: data.origem || "contato",
      user_agent: req.headers.get("user-agent")?.slice(0, 400) || null,
      ip_hash: ipHash,
      referrer: req.headers.get("referer")?.slice(0, 400) || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api/contato] insert error:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar o contato. Tente novamente." },
      { status: 500 },
    );
  }

  // 5) Notificação por e-mail (fire-and-forget — não bloqueia a resposta)
  sendEmail({
    subject: `[NGT] Novo contato — ${data.nome}`,
    html: novoContatoTemplate({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      empresa: data.empresa,
      cargo: data.cargo,
      faturamento_estimado: data.faturamento_estimado,
      mensagem: data.mensagem,
      origem: data.origem,
    }),
  }).catch((e) => console.error("[api/contato] email error:", e));

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
