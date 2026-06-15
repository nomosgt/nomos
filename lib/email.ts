import { Resend } from "resend";

/**
 * Wrapper de email via Resend.
 * Se RESEND_API_KEY não estiver configurado, vira no-op (loga em vez de enviar).
 */

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "NOMOS GT <noreply@nomos.gt>";
const TO_NOTIF = process.env.EMAIL_NOTIF_TO || "";

const resend = apiKey ? new Resend(apiKey) : null;

type SendOpts = {
  to?: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail(opts: SendOpts) {
  const to = opts.to ?? TO_NOTIF;
  if (!to) {
    console.warn("[email] sem destinatário (EMAIL_NOTIF_TO vazio).");
    return { ok: false, skipped: true as const };
  }
  if (!resend) {
    console.log("[email] RESEND_API_KEY ausente — simulando envio:", {
      to,
      subject: opts.subject,
    });
    return { ok: true, skipped: true as const };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[email] erro Resend:", error);
      return { ok: false, error };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] exceção:", err);
    return { ok: false, error: err };
  }
}

/**
 * Templates HTML simples — sem framework, render direto.
 */
export function novoContatoTemplate(data: {
  nome: string;
  email: string;
  telefone?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  faturamento_estimado?: string | null;
  mensagem?: string | null;
  origem?: string | null;
}) {
  const row = (l: string, v?: string | null) =>
    v ? `<tr><td style="padding:6px 12px;color:#666;font-size:13px;">${l}</td><td style="padding:6px 12px;font-size:14px;">${escape(v)}</td></tr>` : "";

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fafafa;padding:32px;">
    <h2 style="margin:0 0 4px;font-size:20px;color:#0e1525;">Novo contato — NOMOS GT</h2>
    <p style="margin:0 0 24px;color:#666;font-size:13px;">Origem: ${escape(data.origem || "contato")}</p>
    <table style="width:100%;background:white;border-collapse:collapse;">
      ${row("Nome", data.nome)}
      ${row("E-mail", data.email)}
      ${row("Telefone", data.telefone || "")}
      ${row("Empresa", data.empresa || "")}
      ${row("Cargo", data.cargo || "")}
      ${row("Faturamento", data.faturamento_estimado || "")}
    </table>
    ${data.mensagem ? `<div style="margin-top:24px;background:white;padding:16px;font-size:14px;line-height:1.5;color:#222;border-left:3px solid #1e3a8a;"><strong style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Mensagem</strong><br/><br/>${escape(data.mensagem).replace(/\n/g, "<br/>")}</div>` : ""}
    <p style="margin-top:32px;font-size:11px;color:#999;">Veja todos os contatos em <a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/contatos" style="color:#1e3a8a;">/admin/contatos</a></p>
  </div>`;
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
