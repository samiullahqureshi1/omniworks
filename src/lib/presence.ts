import { prisma } from './db';
import { emitAppEvent } from './events';
import { getRedis, redisConfigured, redisReady } from './redis';

/**
 * Presence derived from open SSE connections instead of a client heartbeat.
 *
 * The old design had every browser POST /api/presence every 30s, which cost one
 * getSession query plus one upsert per user per 30s — roughly 10 DB ops/second at
 * 150 users, before anyone did any real work. Since /api/realtime already holds an
 * open stream for the lifetime of a session, presence can simply follow that
 * stream's lifecycle: online when the first one opens, offline when the last closes.
 *
 * A user typically holds SEVERAL streams at once (the workspace layout opens one,
 * and the active page component usually opens another), so connections are
 * reference-counted per user — otherwise closing one tab would mark someone offline
 * while they are still connected.
 *
 * NOTE: the counter is per-process. With multiple instances a user could be counted
 * separately on each, so "offline" only settles once their streams on that instance
 * close. Moving this to Redis is the follow-up (checklist 2.2).
 */

type PresenceEntry = { count: number; organizationId: string };

const globalForPresence = global as unknown as {
  presenceConnections?: Map<string, PresenceEntry>;
};

const connections: Map<string, PresenceEntry> =
  globalForPresence.presenceConnections || new Map();

if (process.env.NODE_ENV !== 'production') {
  globalForPresence.presenceConnections = connections;
}

/** How often an already-online user's lastSeen is refreshed in the database. */
const LAST_SEEN_REFRESH_MS = 5 * 60 * 1000;
const lastWrite = new Map<string, number>();

async function writePresence(userId: string, organizationId: string, status: 'ONLINE' | 'OFFLINE') {
  const lastSeen = new Date();

  await prisma.userPresence.upsert({
    where: { userId },
    update: { status, lastSeen, organizationId },
    create: { userId, status, lastSeen, organizationId },
  });

  emitAppEvent('presence_updated', `organization:${organizationId}`, {
    userId,
    status,
    lastSeen: lastSeen.toISOString(),
  });
}

/**
 * Registers an opened realtime stream. Writes to the database only on the user's
 * FIRST connection — subsequent tabs are just counted.
 */
export async function registerPresenceConnection(userId: string, organizationId: string) {
  // Redis mode: count connections in a shared counter so a user with streams on
  // several instances is only marked offline when the LAST one anywhere closes.
  if (redisConfigured() && redisReady()) {
    const client = getRedis();
    try {
      const count = await client!.incr(`presence:${userId}`);
      await client!.expire(`presence:${userId}`, 60 * 60 * 12);
      if (count === 1) await writePresence(userId, organizationId, 'ONLINE');
      connections.set(userId, { count, organizationId });
      return;
    } catch {
      // fall through to the in-process counter
    }
  }

  const existing = connections.get(userId);

  if (existing) {
    existing.count += 1;
    existing.organizationId = organizationId;
    return;
  }

  connections.set(userId, { count: 1, organizationId });
  lastWrite.set(userId, Date.now());

  try {
    await writePresence(userId, organizationId, 'ONLINE');
  } catch (error) {
    console.error('[presence] failed to mark online:', error);
  }
}

/**
 * Registers a closed realtime stream. Marks the user offline only when their LAST
 * stream closes.
 */
export async function releasePresenceConnection(userId: string) {
  const existing = connections.get(userId);
  if (!existing) return;

  if (redisConfigured() && redisReady()) {
    const client = getRedis();
    try {
      const count = await client!.decr(`presence:${userId}`);
      if (count <= 0) {
        await client!.del(`presence:${userId}`);
        connections.delete(userId);
        await writePresence(userId, existing.organizationId, 'OFFLINE');
      }
      return;
    } catch {
      // fall through to the in-process counter
    }
  }

  existing.count -= 1;
  if (existing.count > 0) return;

  connections.delete(userId);
  lastWrite.delete(userId);

  try {
    await writePresence(userId, existing.organizationId, 'OFFLINE');
  } catch (error) {
    console.error('[presence] failed to mark offline:', error);
  }
}

/**
 * Cheap keep-alive for `lastSeen`, called from the stream heartbeat. Rate-limited to
 * one write per user per LAST_SEEN_REFRESH_MS so a long session costs ~12 writes/hour
 * instead of 120.
 */
export async function touchPresence(userId: string, organizationId: string) {
  if (!connections.has(userId)) return;

  const previous = lastWrite.get(userId) ?? 0;
  if (Date.now() - previous < LAST_SEEN_REFRESH_MS) return;
  lastWrite.set(userId, Date.now());

  try {
    await prisma.userPresence.update({
      where: { userId },
      data: { status: 'ONLINE', lastSeen: new Date(), organizationId },
    });
  } catch (error) {
    console.error('[presence] failed to refresh lastSeen:', error);
  }
}
