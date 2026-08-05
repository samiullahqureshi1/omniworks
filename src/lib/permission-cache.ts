import type { Permissions } from './auth';
import { redisConfigured, redisDel, redisGetJson, redisReady, redisSetJson } from './redis';

/**
 * Short-lived cache for the per-request membership lookup.
 *
 * getSession() resolves role + permissions from the database on EVERY request so
 * permission changes apply without re-login. That is correct, but it costs one
 * round trip per request — ~160 ms against the current (remote) database, on every
 * single request.
 *
 * This caches that lookup for a short TTL. Correctness is preserved by invalidating
 * explicitly whenever a membership's role, permissions or status changes, so a
 * permission edit still takes effect on the very next request. The TTL is only a
 * backstop — for anything that mutates a user without calling the invalidator, and
 * for other instances in a multi-instance deployment.
 *
 * NOTE: per-process. With several instances, an edit on instance A is invalidated
 * immediately there but bounded by the TTL elsewhere. Moving this to Redis removes
 * that window (checklist 2.2).
 */

export type CachedMembership = {
  id: string;
  role: string;
  permissions: Permissions | null;
} | null;

type Entry = { value: CachedMembership; expiresAt: number };

const globalForCache = global as unknown as {
  permissionCache?: Map<string, Entry>;
  permissionCacheUserIndex?: Map<string, string>;
};

/** key = `${email}:${organizationId}` — matches how getSession looks memberships up. */
const cache: Map<string, Entry> = globalForCache.permissionCache || new Map();
/** userId -> cache key, so writes can invalidate without knowing the email/org. */
const userIndex: Map<string, string> =
  globalForCache.permissionCacheUserIndex || new Map();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.permissionCache = cache;
  globalForCache.permissionCacheUserIndex = userIndex;
}

const TTL_MS = Number(process.env.PERMISSION_CACHE_TTL_MS) || 30_000;

/** Stop unbounded growth if a process sees a very large number of memberships. */
const MAX_ENTRIES = 5_000;

export function membershipCacheKey(email: string, organizationId: string): string {
  return `${email}:${organizationId}`;
}

/**
 * Returns the cached membership, or runs `loader` and caches the result.
 * `null` (no such membership) is cached too, so a missing row doesn't re-query
 * on every request.
 */
export async function getCachedMembership(
  email: string,
  organizationId: string,
  loader: () => Promise<CachedMembership>
): Promise<CachedMembership> {
  const key = membershipCacheKey(email, organizationId);

  // When Redis is available it is the ONLY cache. Sharing one store means an
  // invalidation on any instance is seen by all of them immediately, instead of
  // each process holding its own copy until the TTL lapses.
  if (redisConfigured() && redisReady()) {
    const cached = await redisGetJson<CachedMembership>(`perm:${key}`);
    if (cached !== null) return cached;

    const loaded = await loader();
    await redisSetJson(`perm:${key}`, loaded, TTL_MS);
    // Reverse index: writes only know the userId, so record which key to drop.
    if (loaded?.id) await redisSetJson(`permuser:${loaded.id}`, key, TTL_MS);
    return loaded;
  }

  const hit = cache.get(key);

  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }

  const value = await loader();

  if (cache.size >= MAX_ENTRIES) {
    // Cheap eviction: drop the oldest insertion (Map preserves insertion order).
    const oldest = cache.keys().next().value;
    if (oldest) {
      const evicted = cache.get(oldest);
      cache.delete(oldest);
      if (evicted?.value?.id) userIndex.delete(evicted.value.id);
    }
  }

  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  if (value?.id) userIndex.set(value.id, key);

  return value;
}

/**
 * Drops a membership from the cache. Call this after ANY change to a user's role,
 * permissions or status so the next request sees the new value immediately.
 */
export function invalidateUserPermissions(userId: string): void {
  // Redis mode: the in-process userIndex is empty, so resolve the key from the
  // shared reverse index. Fire-and-forget — callers don't await invalidation.
  if (redisConfigured()) {
    void (async () => {
      const sharedKey = await redisGetJson<string>(`permuser:${userId}`);
      if (sharedKey) {
        await redisDel(`perm:${sharedKey}`);
        await redisDel(`permuser:${userId}`);
      }
    })();
  }

  const key = userIndex.get(userId);
  if (key) {
    cache.delete(key);
    userIndex.delete(userId);
    // Fire-and-forget: clears the shared copy so every instance re-reads.
    void redisDel(`perm:${key}`);
    return;
  }

  // Not indexed (e.g. the user was never loaded on this instance, or was evicted).
  // Scan as a fallback — the cache is small and this path is rare.
  for (const [k, entry] of cache) {
    if (entry.value?.id === userId) {
      cache.delete(k);
      void redisDel(`perm:${k}`);
      return;
    }
  }
}

/** Clears everything. Useful for tests and bulk permission changes. */
export function invalidateAllPermissions(): void {
  cache.clear();
  userIndex.clear();
}

/** Exposed for tests / diagnostics. */
export function permissionCacheStats() {
  return { size: cache.size, ttlMs: TTL_MS };
}
