# Scaling Checklist — 100 to 150 Concurrent Users

**Target:** 100–150 concurrent users, responsive (p95 < 1s)
**Baseline measured 2026-08-03** (production build, single instance):

| Metric | Measured | Note |
|---|---|---|
| Throughput ceiling | **12.6 req/s** | flatlines here |
| DB round-trip | **217 ms/query** | Neon `ap-southeast-1` (Singapore) |
| Single request (warm) | **~1.2 s** | ~3 sequential queries |
| p50 @ 100 concurrent | **4,705 ms** | p95 7,138 ms |
| Idle background load | **~10 req/s @ 150 users** | ~80% of ceiling before any real work |

---

## PHASE 0 — Blocker (do before real users)

- [ ] **0.1 Set a real `JWT_SECRET`**
  - Generate: `openssl rand -hex 64`
  - Add to `.env` **and** Vercel env vars, and to `.env.example`
  - Remove the `|| 'omnitrack-super-secret-jwt-key-2026'` fallback in `src/lib/auth.ts` and `src/proxy.ts` — throw instead
  - *Why:* the secret is hardcoded in source and set nowhere. Anyone can forge a session for any user in any org.
  - ✅ **Verify:** app fails to boot with the var unset; existing sessions invalidated (users log in again)

---

## PHASE 1 — Biggest wins (gets you to ~150)

- [ ] **1.1 Co-locate the database with the app**
  - Deploy Vercel to the same region as Neon (or move Neon to the app's region)
  - *Why:* 217 ms/query is pure geography. Same-region is 1–5 ms.
  - ✅ **Verify:** re-run the DB round-trip probe → expect < 10 ms
  - 📈 **Expected: ~10× latency improvement — the single biggest lever**

- [ ] **1.2 Add a connection pooler**
  - Use Neon's **pooled** connection string (or PgBouncer) for `DATABASE_URL`
  - Reduce `max: 20` in `src/lib/db.ts` (serverless wants a small per-instance pool)
  - *Why:* 20 connections × N serverless instances exhausts Postgres. This is the hard wall.
  - ✅ **Verify:** run the load test at 100 concurrent — no connection errors

- [ ] **1.3 Replace the two 30s pollers with SSE push**
  - `usePresence` (`src/hooks/usePresence.ts`) → 30s `POST /api/presence` (a DB **write**)
  - `Header.tsx:118` notifications → 30s `getMyNotificationsAction` (a DB read)
  - Push both through the existing `appEventEmitter` / `/api/realtime` channel instead
  - *Why:* 150 users idling = ~10 req/s = ~80% of the entire measured ceiling
  - ✅ **Verify:** open 5 tabs, watch the server log — background requests should be ~0
  - 📈 **Expected: frees ~80% of capacity**

- [ ] **1.4 Fix the 50-connection realtime cap**
  - `src/lib/events.ts` → `appEventEmitter.setMaxListeners(50)` is a hard cap
  - Raise it, and move fan-out to Redis pub/sub (or Pusher/Ably)
  - *Why:* one SSE connection per user; in-memory `EventEmitter` also doesn't fan out across instances
  - ✅ **Verify:** 100 simultaneous SSE connections, no `MaxListenersExceededWarning`

---

## PHASE 2 — Headroom & stability

- [ ] **2.1 Cache the `getSession` permission lookup** (~30s TTL, Redis or LRU)
  - *Why:* permissions are read from the DB on every request (so changes apply without re-login). Correct, but it's +1 round trip everywhere.
  - ⚠️ Keep the TTL short or permission revocation gets delayed
  - ✅ **Verify:** queries per request drop by 1; permission change still applies within the TTL

- [ ] **2.2 Add Redis** (Upstash) — cache + rate-limit store + presence + SSE fan-out
  - ✅ **Verify:** hot reads (org settings, statuses, user lists) served from cache

- [ ] **2.3 Cursor pagination** on projects / tasks / time-entries / notifications
  - *Why:* payloads currently grow unbounded with your data
  - ✅ **Verify:** list endpoint response size stays flat as rows grow

- [ ] **2.4 Rate limiting** (per-IP + per-user) on auth, uploads, webhooks, mutations
  - *Why:* both a security gap and a scale gap — one retry loop can eat the whole ceiling
  - ✅ **Verify:** burst of 100 logins → 429s, app stays responsive

- [ ] **2.5 Add Sentry + structured logging**
  - *Why:* you can't tune what you can't see (currently 36 `console.log`s)
  - ✅ **Verify:** a thrown error appears in Sentry with tenant/request context

---

## PHASE 3 — Verify the target

- [ ] **3.1 Re-run the load test** and compare against the baseline table above
  - 1 / 10 / 25 / 50 / 100 concurrent → record p50, p95, req/s, errors
- [ ] **3.2 Soak test** — 150 users' worth of background load for 30 min, watch memory + DB connections
- [ ] **3.3 Confirm success criteria:** p95 < 1s at 100 concurrent, 0 errors, DB connections stable

---

## Success criteria

| Metric | Baseline | Target |
|---|---|---|
| DB round-trip | 217 ms | **< 10 ms** |
| Throughput | 12.6 req/s | **> 100 req/s** |
| p95 @ 100 concurrent | 7,138 ms | **< 1,000 ms** |
| Idle load @ 150 users | ~10 req/s | **< 1 req/s** |
| Realtime connections | 50 cap | **150+** |

---

## Notes

- `unstable_cache` is already used in `src/app/workspace/layout.tsx` — a foundation exists, it's just not on the hot paths.
- **Phase 1.1 + 1.2 alone will likely hit the 150-user target.** Phase 2 is headroom and operational safety.
- Everything above is deployment/config/caching. **No rewrite, no schema migration.**
