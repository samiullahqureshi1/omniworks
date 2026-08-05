import { headers } from 'next/headers';
import { redisConfigured, redisIncrWithTtl, redisReady } from './redis';

/**
 * Sliding-window rate limiting.
 *
 * The app previously had none: login, signup and password reset could be hit as fast
 * as the network allowed, so passwords were brute-forceable and a single retry loop
 * could consume the whole request budget (measured ceiling is ~25 req/s).
 *
 * This is an in-process limiter. It is effective for a single instance and costs
 * nothing, but each instance keeps its own counters — so with N instances the real
 * limit is N × `limit`. Moving the counters to Redis makes it exact across instances
 * (checklist 2.2), and this module's API is shaped so that swap is a drop-in.
 */

type Bucket = { hits: number[]; blockedUntil?: number };

const globalForRateLimit = global as unknown as { rateLimitBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = globalForRateLimit.rateLimitBuckets || new Map();
if (process.env.NODE_ENV !== 'production') globalForRateLimit.rateLimitBuckets = buckets;

export type RateLimitRule = {
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional lockout applied once the limit is exceeded. */
  blockMs?: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Milliseconds until the caller may retry (0 when allowed). */
  retryAfterMs: number;
};

/** Sensible defaults for the surfaces that need protecting. */
export const RATE_LIMITS = {
  /** Password login — the brute-force target. Deliberately strict. */
  LOGIN: { limit: 8, windowMs: 5 * 60_000, blockMs: 5 * 60_000 },
  /** Account creation — stops automated signup floods. */
  SIGNUP: { limit: 5, windowMs: 60 * 60_000 },
  /** Password reset request — also an account-enumeration vector. */
  PASSWORD_RESET: { limit: 5, windowMs: 60 * 60_000 },
  /** 2FA verification — prevents brute-forcing a 6-digit code. */
  TWO_FACTOR: { limit: 10, windowMs: 5 * 60_000, blockMs: 5 * 60_000 },
  /** OAuth start — cheap, but shouldn't be a redirect amplifier. */
  OAUTH: { limit: 20, windowMs: 5 * 60_000 },
  /** File uploads — expensive (network + Cloudinary quota). */
  UPLOAD: { limit: 30, windowMs: 60_000 },
  /** Unauthenticated webhooks. */
  WEBHOOK: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Records a hit against `key` and reports whether it is allowed.
 * Pure bookkeeping — callers decide what to do with a rejection.
 */
export function rateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.blockedUntil - now };
  }

  // Drop hits that have aged out of the window.
  const windowStart = now - rule.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= rule.limit) {
    if (rule.blockMs) bucket.blockedUntil = now + rule.blockMs;
    buckets.set(key, bucket);
    const retryAfterMs = rule.blockMs ?? Math.max(0, bucket.hits[0] + rule.windowMs - now);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  bucket.hits.push(now);
  bucket.blockedUntil = undefined;
  buckets.set(key, bucket);

  // Opportunistic cleanup so idle keys don't accumulate forever.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      const stale = b.hits.every((t) => t <= windowStart) && (!b.blockedUntil || b.blockedUntil < now);
      if (stale) buckets.delete(k);
      if (buckets.size <= 5_000) break;
    }
  }

  return { ok: true, remaining: rule.limit - bucket.hits.length, retryAfterMs: 0 };
}

/**
 * Redis-backed variant. Counters are shared, so the limit is enforced across every
 * instance rather than per-process (in-memory, N instances means N × the limit).
 * Falls back to the in-process limiter whenever Redis is unset or unreachable.
 */
export async function rateLimitShared(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  if (!redisConfigured() || !redisReady()) {
    return rateLimit(key, rule);
  }

  // Fixed window keyed by time bucket — one INCR per request, and the key expires
  // on its own, so there is nothing to clean up.
  const bucket = Math.floor(Date.now() / rule.windowMs);
  const count = await redisIncrWithTtl(`rl:${key}:${bucket}`, rule.windowMs);

  if (count === null) return rateLimit(key, rule); // Redis hiccup — degrade locally.

  if (count > rule.limit) {
    const retryAfterMs = rule.blockMs ?? (bucket + 1) * rule.windowMs - Date.now();
    return { ok: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  return { ok: true, remaining: rule.limit - count, retryAfterMs: 0 };
}

/**
 * Best-effort client IP. Behind Vercel/proxies the real address is in
 * x-forwarded-for; the first entry is the original client.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return h.get('x-real-ip') || h.get('cf-connecting-ip') || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Same as getClientIp but for route handlers, which already hold the Request. */
export function getClientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

/** Human-friendly retry hint for error messages. */
export function retryAfterMessage(retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds < 60) return `Please try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;
  const minutes = Math.ceil(seconds / 60);
  return `Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

/**
 * Convenience wrapper for server actions: limits by IP and an action name.
 * When `identifier` is supplied (e.g. the submitted email) it is limited too, so an
 * attacker rotating IPs still can't hammer one account.
 */
export async function checkRateLimit(
  action: keyof typeof RATE_LIMITS,
  identifier?: string
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[action];
  const ip = await getClientIp();

  const byIp = await rateLimitShared(`${action}:ip:${ip}`, rule);
  if (!byIp.ok) return byIp;

  if (identifier) {
    return rateLimitShared(`${action}:id:${identifier.toLowerCase()}`, rule);
  }
  return byIp;
}

/** Test/diagnostic helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
