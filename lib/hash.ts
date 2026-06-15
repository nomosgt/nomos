import { createHash } from "crypto";

/**
 * Hash de IP — não armazenamos IP cru por privacidade.
 * Útil para dedup, rate-limit complementar e correlação anônima de eventos.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || "nomos-gt-default-salt-2026";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 24);
}

/**
 * Extrai IP do request priorizando os headers comuns de proxy (Vercel, Cloudflare).
 */
export function getRequestIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return null;
}
