/**
 * Presence is no longer driven from the client.
 *
 * This hook used to POST /api/presence every 30 seconds, costing one session lookup
 * plus one database upsert per user per 30s — roughly 10 DB ops/second at 150 users,
 * purely for idle heartbeats. Presence is now derived on the server from the lifetime
 * of the /api/realtime SSE stream that the workspace layout already keeps open
 * (see src/lib/presence.ts), so the same information costs one write when a user
 * connects and one when they disconnect.
 *
 * Kept as a no-op so existing call sites don't need to change, and so anyone reaching
 * for it finds this note instead of re-adding a poll.
 */
export function usePresence() {
  // Intentionally empty — see the note above.
}
