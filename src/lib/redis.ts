import Redis from 'ioredis';

/**
 * Optional Redis connection.
 *
 * Everything in this file is gated on REDIS_URL being set. Without it every helper
 * reports "not configured" and callers fall back to their in-process implementation,
 * so the app behaves exactly as it does today. Set REDIS_URL and the same code paths
 * become correct across multiple instances.
 *
 * Works with any Redis URL, including Upstash's `rediss://…` endpoint.
 */

const globalForRedis = global as unknown as {
  redisClient?: Redis | null;
  redisSubscriber?: Redis | null;
  redisUnavailableLogged?: boolean;
};

function createClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const client = new Redis(url, {
    // Fail fast rather than queueing commands forever if Redis is unreachable —
    // callers fall back to in-memory, which is better than hanging a request.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: false,
    connectTimeout: 5_000,
    // Serverless-friendly: don't hold a reconnect loop open indefinitely.
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2_000)),
  });

  client.on('error', (err) => {
    // Log once; a broken Redis must never spam the logs or crash the process.
    if (!globalForRedis.redisUnavailableLogged) {
      globalForRedis.redisUnavailableLogged = true;
      console.error('[redis] connection error — falling back to in-memory:', err.message);
    }
  });

  return client;
}

/** Shared client, or null when REDIS_URL is unset. */
export function getRedis(): Redis | null {
  if (globalForRedis.redisClient !== undefined) return globalForRedis.redisClient;
  const client = createClient();
  globalForRedis.redisClient = client;
  return client;
}

/**
 * A SECOND connection dedicated to pub/sub. Redis puts a subscribed connection into
 * subscriber mode, where normal commands are rejected — so subscribing must not
 * share the client used for get/set.
 */
export function getRedisSubscriber(): Redis | null {
  if (globalForRedis.redisSubscriber !== undefined) return globalForRedis.redisSubscriber;
  const client = createClient();
  globalForRedis.redisSubscriber = client;
  return client;
}

export function redisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

/** True only when Redis is configured AND the socket is actually usable. */
export function redisReady(): boolean {
  const client = getRedis();
  return Boolean(client && client.status === 'ready');
}

// ─── Small helpers used by the cache / rate limiter ─────────────────────────

/** GET returning parsed JSON, or null on any failure (never throws). */
export async function redisGetJson<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client || client.status !== 'ready') return null;
  try {
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** SET with TTL. Returns false if it could not be stored. */
export async function redisSetJson(key: string, value: unknown, ttlMs: number): Promise<boolean> {
  const client = getRedis();
  if (!client || client.status !== 'ready') return false;
  try {
    await client.set(key, JSON.stringify(value), 'PX', ttlMs);
    return true;
  } catch {
    return false;
  }
}

export async function redisDel(key: string): Promise<void> {
  const client = getRedis();
  if (!client || client.status !== 'ready') return;
  try {
    await client.del(key);
  } catch {
    // Best effort — the TTL will expire the entry anyway.
  }
}

/**
 * Atomic sliding-window counter: increments `key` and returns the new count,
 * setting the expiry on first use. Returns null when Redis is unavailable so the
 * caller can fall back.
 */
export async function redisIncrWithTtl(key: string, ttlMs: number): Promise<number | null> {
  const client = getRedis();
  if (!client || client.status !== 'ready') return null;
  try {
    const results = await client.multi().incr(key).pexpire(key, ttlMs, 'NX').exec();
    const count = results?.[0]?.[1];
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}
