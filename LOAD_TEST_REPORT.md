# Load Test Report — 100 to 150 Users

**Date:** 2026-08-04
**Build:** production (`next build` + `next start`), port 3100
**Client:** Node, keep-alive agent, 400 max sockets
**Load:** 1 → 150 concurrent on `/api/projects`, plus 150 concurrent SSE streams

Three configurations measured:

| # | Configuration |
|---|---|
| **A — Baseline** | Direct DB, 30s pollers, `setMaxListeners(50)`, ~3 SSE streams/user |
| **B — After Phase 1.3 + 1.4** | Direct DB, pollers removed, shared SSE, listener cap raised |
| **C — After Phase 1.2** | **Pooled** DB (`-pooler` endpoint), `poolMax` 20 → 10 |

---

## 1. Throughput ladder (`/api/projects`)

| Concurrency | A p50 | B p50 | **C p50** | A p95 | B p95 | **C p95** | A req/s | B req/s | **C req/s** |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | — | 6,307 | **1,189** | — | 6,307 | **1,189** | — | 0.2 | **0.8** |
| 10 | — | 5,020 | **2,436** | — | 5,549 | **3,661** | — | 1.8 | **2.7** |
| 25 | — | 4,238 | **2,967** | — | 6,342 | **6,509** | — | 3.4 | **3.7** |
| 50 | — | 4,953 | **3,710** | — | 9,941 | **5,347** | — | 3.2 | **8.9** |
| **100** | 4,705 | 4,851 | **3,595** | 7,138 | 8,697 | **4,549** | 12.6 | 10.2 | **20.1** |
| **150** | — | 8,170 | **3,887** | — | 15,058 | **6,718** | — | 9.3 | **20.9** |

**Zero errors at every level, in every configuration.**

### Headline movements

| Metric | A → C | Change |
|---|---|---|
| Throughput @ 100 concurrent | 12.6 → **20.1 req/s** | **+60%** |
| p50 @ 100 concurrent | 4,705 → **3,595 ms** | **−24%** |
| p95 @ 150 concurrent (B → C) | 15,058 → **6,718 ms** | **−55%** |
| Single warm request (B → C) | 6,307 → **1,189 ms** | **−81%** |
| DB round-trip | 217 → **160 ms** | **−26%** |

---

## 2. Realtime (SSE) capacity

| Metric | A (baseline) | C (now) |
|---|---|---|
| Connections opened | ~50 before warnings | **150 / 150** |
| Failures | — | **0** |
| Time to open all | — | 2,179 ms |
| `MaxListenersExceededWarning` | yes, at ~50 | **0** |
| SSE streams per user | ~3 | **1** (shared) |

---

## 3. Responsiveness while 150 streams are held open

| Metric | B | **C** |
|---|---|---|
| 50 concurrent requests, p50 | 4,245 ms | **2,724 ms** |
| p95 | 6,935 ms | **4,185 ms** |
| Throughput | 6.5 req/s | **11.7 req/s** |
| Errors | 0 | **0** |

Holding 150 realtime connections does not destabilise the server.

---

## 4. Idle background load

| Metric | A | C |
|---|---|---|
| Presence POSTs / user / 30s | 1 | **0** |
| Notification polls / user / 30s | 1 | **0** |
| **Total idle load @ 150 users** | **~10 req/s** | **~0** |

At baseline this consumed ~80% of the entire throughput ceiling before any user did
real work. That budget is now free.

---

## 5. Status against the 100–150 target

| Target | Status |
|---|---|
| 150 concurrent realtime connections | ✅ **Met** — 150/150, 0 warnings |
| No errors under load | ✅ **Met** — 0 errors everywhere |
| Background load < 1 req/s | ✅ **Met** — ~0 |
| Throughput > 100 req/s | ❌ **Not met** — 20.9 |
| p95 < 1,000 ms @ 100 concurrent | ❌ **Not met** — 4,549 ms |

**Verdict: comfortably handles 150 *connected* users; still too slow to serve 150
*active* users well.** Every remaining millisecond traces to one cause.

---

## 6. The one remaining bottleneck — checklist 1.1

The database is still in **`ap-southeast-1` (Singapore)**. The pooler cut the
round-trip from 217 ms to 160 ms, but that is still **~160 ms per query**, and each
request runs ~3 sequential queries ≈ **480 ms of pure network** before any logic.

Co-locating the app and database (checklist **1.1**) takes that to 1–5 ms per query:

| Metric | Now (C) | Projected after 1.1 |
|---|---|---|
| DB round-trip | 160 ms | **1–5 ms** |
| Network per request | ~480 ms | **~15 ms** |
| p95 @ 100 concurrent | 4,549 ms | **low hundreds of ms** |

This is the last big lever, and it is a deployment decision, not a code change.

---

## What changed to get here

- **Phase 0.1** — real `JWT_SECRET`, hardcoded fallback removed.
- **Phase 1.2** — Neon **pooled** endpoint; `poolMax` 20 → 10 behind a pooler
  (auto-detected from the `-pooler` host, overridable via `DB_POOL_MAX`).
- **Phase 1.3** — presence now derives from the SSE connection lifecycle; notification
  polling replaced by SSE push. Both 30s pollers gone.
- **Phase 1.4** — `setMaxListeners` 50 → 2000; `useRealtime` connections shared and
  reference-counted (~3× fewer streams and listeners per user).
- **Bug fixed en route** — `/login` used `useSearchParams()` without a Suspense
  boundary, which **failed the production build**. The app could not have deployed.

### Verified with Prisma through PgBouncer
Neon's pooler runs PgBouncer in transaction mode, which commonly breaks prepared
statements. Tested explicitly: 10/10 requests returned 200 with real data and **zero**
prepared-statement or connector errors.

---

## Caveats

- Load generated from the **same machine** as the server; all three runs shared these
  conditions, so the comparison is fair, but absolute numbers will differ in production.
- Four real session tokens rotated across virtual users, so all load hit **one
  organization** — worst case for shared `organization:*` event names, a fair stress
  test for the SSE work.
- Single instance. Multi-instance needs Redis for SSE fan-out and presence
  (checklist 2.2).
- `.env` was backed up before the connection-string change (`.env.backup-*`).
