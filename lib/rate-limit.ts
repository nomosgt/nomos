import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limit por IP, sliding window.
 * Se UPSTASH_REDIS_REST_URL/TOKEN não estiverem configurados, vira no-op
 * (sempre permite) — útil em dev e antes de habilitar Upstash.
 */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const hasUpstash = !!(redisUrl && redisToken);

const ratelimit = hasUpstash
  ? new Ratelimit({
      redis: new Redis({ url: redisUrl!, token: redisToken! }),
      limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests por minuto por IP
      analytics: true,
      prefix: "ngt:rl",
    })
  : null;

export async function checkRateLimit(identifier: string): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
}> {
  if (!ratelimit) {
    // Sem Upstash configurado — permite tudo
    return { success: true, remaining: 999, reset: 0 };
  }
  const r = await ratelimit.limit(identifier);
  return { success: r.success, remaining: r.remaining, reset: r.reset };
}
