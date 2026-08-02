# Production Readiness Report — `omnitrack` / omniwork

**Report date:** 2026-08-02
**Reviewed by:** Claude Code (automated codebase analysis)
**Repository:** `/Users/zeshanqureshi/Desktop/omniwork`
**Branch:** `main`
**Build tooling:** Next.js 16.2.9 · React 19.2.4 · Prisma 7.8.0 · PostgreSQL · Vercel

---

## 0. Executive Summary

**Verdict: 🔴 NOT production-ready yet.**

The application is **functionally rich and architecturally sound in its fundamentals** — clean multi-tenant data isolation, real authentication with bcrypt + JWT + 2FA, and a production build that compiles with no type or lint errors. However, it carries **one critical security flaw** (a hardcoded, publicly-known JWT signing secret with no real secret configured) and several **high-severity gaps** (no login rate limiting, unauthenticated webhooks, internal error leakage, and zero automated tests) that make it unsafe to expose to real customer data today.

**Estimated effort to reach a defensible launch state:** ~2–4 focused engineering days.

| Area | Status |
|------|--------|
| Core architecture & multi-tenancy | ✅ Good |
| Build & type safety | ✅ Passes |
| Authentication design | ⚠️ Good design, critical config flaw |
| Secrets management | ⚠️ Not committed (good), but JWT secret missing |
| Authorization / access control | ✅ Consistent tenant scoping |
| Input validation | 🟡 Manual, inconsistent |
| Rate limiting / abuse protection | 🔴 Absent |
| Webhook security | 🔴 Unauthenticated |
| Error handling / info disclosure | 🟠 Leaks internals |
| Automated testing | 🔴 None |
| Observability / monitoring | 🟡 console.log only |
| Security headers / CSP | 🟡 None configured |
| Documentation | 🟡 Boilerplate README |

---

## 1. What This Application Is

A multi-tenant SaaS platform (internally named `omnitrack`, product name "omniwork") combining several product surfaces:

- **Project & task management** — projects, tasks, custom statuses/stages, assignees, priorities, milestones, templates, drag-and-drop boards (`@dnd-kit`).
- **Time tracking** — active timers, manual time entries, idle-period detection, **screenshot capture**, activity logs, timesheets, and an hours-request/approval workflow.
- **Desktop companion app** — an Electron app (`desktop/` directory) that authenticates against the web API, syncs memos, and uploads screenshots.
- **Conversations & chat** — project messages, task messages, chat groups, @mentions (`react-mentions`), read receipts, user presence, and message visibility levels (PUBLIC/internal for clients).
- **Planner / meetings module** — leads/CRM, public booking pages (`/book/[slug]`), Google Calendar + Google Meet integration (per-organization OAuth), meeting reminders, and **Gemini-powered transcript analysis** after meetings.
- **Multi-organization identity** — a single email/person can hold separate user records across multiple orgs (owner, member, or client), with org-switching that re-mints the session and a "last org" restore on login.
- **Marketing/public site** — landing, blog, careers, pricing, help center, legal pages, etc.

**Scale of codebase:** ~216 TypeScript/TSX files, 40 API routes, 23 server-action modules, 50+ Prisma models across a 958-line schema.

---

## 2. Methodology

This review examined:
- Project structure, `package.json`, build config (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vercel.json`).
- The authentication core (`src/lib/auth.ts`, `src/proxy.ts`, `src/lib/db.ts`).
- Environment configuration (`.env`, `.env.local`, `.env.example`) — keys only, values redacted.
- A representative sample of API routes and server actions for auth enforcement and tenant scoping.
- Security-sensitive endpoints: login, org-switch, cron jobs, webhooks, file uploads, desktop auth.
- A full production build (`next build`) to confirm compilation.
- Git history for accidentally committed secrets.

---

## 3. Strengths (What's Done Well) ✅

### 3.1 The production build passes cleanly
`next build` compiles successfully in ~8 seconds with **no TypeScript errors and no ESLint errors**. TypeScript `strict: true` is enabled in `tsconfig.json`, and there are **no** `ignoreBuildErrors` / `ignoreDuringBuilds` escape hatches in `next.config.ts`. This is a meaningful quality signal — many real-world Next.js apps ship with type checking disabled.

### 3.2 Multi-tenant data isolation is implemented correctly
This is the single hardest thing to get right in a multi-tenant SaaS, and it is done **consistently**. Every data query sampled scopes by `organizationId` taken from the cryptographically verified session — not from user input. Example from `src/app/api/tasks/[taskId]/messages/route.ts`:

```ts
const session = await getSession();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const task = await prisma.task.findFirst({
  where: { id: taskId, organizationId: session.organizationId },  // tenant-scoped
  include: { project: true }
});
```

Even nested reads (messages, mentions) re-apply `organizationId`, and client-role users are further restricted to `visibility: 'PUBLIC'`. **28 of 40** API routes and **22 of 23** server actions enforce `getSession()`. The routes that skip it are intentional (public booking pages, and a notifications route that delegates to an already-authenticated server action).

### 3.3 Authentication fundamentals are real
- **Passwords** are hashed with bcrypt (`genSalt(10)` + `bcrypt.hash`) — `src/lib/auth.ts:19-26`. No plaintext or weak hashing.
- **Session cookies** are `httpOnly`, `secure` in production, `sameSite: 'lax'`, path-scoped, with a 7-day expiry — `src/lib/auth.ts:52-58`.
- **Two-factor authentication** exists (`speakeasy` + `qrcode`); `loginAction` returns `requiresTwoFactor` and defers session creation when 2FA is enabled.
- **`getSession()` is wrapped in React `cache()`** so it runs at most once per request — good for performance, and it verifies the JWT cryptographically without a DB round-trip on the happy path.

### 3.4 Secrets are not committed to git
`.gitignore` ignores all `.env*` files, and `git log --all -- .env .env.local` returns **nothing** — secrets were never committed to history. Real credentials (database URL, Cloudinary secret, Gemini API key, Google client secret, email password) live only in the untracked local `.env`.

### 3.5 Several sensitive endpoints are properly gated
- **Cron routes** (`/api/cron/meeting-reminders`, `/api/cron/transcript-poll`) verify an `Authorization: Bearer <CRON_SECRET>` header before doing work.
- **Upload routes** (`/api/upload/cloudinary`, `/api/conversations/upload`) require a valid session.
- **Org-switch** (`/api/organizations/switch`) re-validates membership/ownership against the database before switching, returning 403 for orgs the user can't access.

### 3.6 Reasonable database connection setup
`src/lib/db.ts` uses a pooled `pg` connection (max 20, sensible timeouts), enables TLS with `rejectUnauthorized: true` for remote/production databases, and uses the singleton-in-dev pattern to avoid connection exhaustion during hot reload.

---

## 4. Findings by Severity

### 🔴 CRITICAL — must fix before ANY deployment

#### C-1. Hardcoded JWT signing secret, and `JWT_SECRET` is not configured anywhere

**Files:** `src/lib/auth.ts:7`, `src/proxy.ts:6`

```ts
const JWT_SECRET = process.env.JWT_SECRET || 'omnitrack-super-secret-jwt-key-2026';
```

**Evidence:** The string `JWT_SECRET` appears in **none** of `.env`, `.env.local`, or `.env.example`. Therefore, at runtime today, the app falls back to the constant `'omnitrack-super-secret-jwt-key-2026'` — a value that is **hardcoded in the source repository** and used to both **sign** and **verify** every session token.

**Impact (why this is critical):** Session tokens are the entire basis of authentication. Because the signing key is a publicly-known constant, **anyone who sees this repo can forge a valid JWT** for any `userId` and any `organizationId`. That is a complete authentication bypass and a complete break of multi-tenant isolation — an attacker could mint a token claiming to be the OWNER of any organization and read/write all of that tenant's data. Everything good in Section 3 is nullified by this one line as long as the real secret is unset.

**Fix:**
1. Generate a strong secret: `openssl rand -hex 64`.
2. Set `JWT_SECRET` in `.env` (local) **and** in the Vercel project environment variables (production).
3. **Remove the `|| '...'` fallback** in both files so the app throws on boot if the secret is missing, rather than silently using a known-insecure value:
   ```ts
   const JWT_SECRET = process.env.JWT_SECRET;
   if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');
   ```
4. Add `JWT_SECRET=` to `.env.example` so future deployers know it's required.
5. Note: rotating the secret invalidates all existing sessions (users must log in again) — acceptable and expected.

---

### 🟠 HIGH — fix before real users / real data

#### H-1. No rate limiting or brute-force protection on authentication

**File:** `src/app/actions/auth.ts` (`loginAction`, line 138)

**Description:** The login flow does a straight email lookup + bcrypt compare with **no attempt throttling, no lockout, and no CAPTCHA**. The same applies to signup, forgot-password, and the desktop auth endpoint (`/api/desktop/auth`). There is **no rate-limiting library or middleware anywhere** in the codebase (confirmed by search — no `ratelimit`/`rate-limit` references).

**Impact:** Attackers can brute-force passwords and enumerate accounts at unlimited speed. Combined with the absence of account lockout, a weak user password is trivially crackable. Public endpoints are also open to abuse/DoS.

**Fix:** Add per-IP and per-email rate limiting (e.g. `@upstash/ratelimit` with Redis, or Vercel's built-in) to `loginAction`, `signupAction`, forgot-password, and `/api/desktop/auth`. Consider progressive delays or temporary lockout after N failed attempts, and CAPTCHA on repeated failures.

#### H-2. Google webhooks are unauthenticated (spoofable)

**Files:** `src/app/api/webhooks/google-calendar/route.ts`, `src/app/api/webhooks/google-meet/route.ts`, `src/app/api/webhooks/google-pubsub/route.ts`

**Description:** These endpoints act on `x-goog-*` request headers (`x-goog-resource-state`, `x-goog-channel-id`, etc.) but perform **no verification of a channel token or signature**. Any anonymous caller can POST a crafted body to trigger the meeting/transcript processing pipeline.

**Impact:** An attacker can spoof "meeting ended" or "resource changed" notifications to trigger unnecessary processing, poll for transcripts, create spurious records, or drive load/cost (Gemini calls). Depending on downstream logic, it may allow injecting attacker-controlled data into meeting records.

**Fix:** When registering Google push channels, set a secret `X-Goog-Channel-Token` and verify it on every webhook request. Reject requests whose token doesn't match. For Pub/Sub, verify the OIDC/JWT token Google attaches.

#### H-3. Internal error messages returned to clients (information disclosure)

**Files:** ~37 handlers across `src/app/api/**` and `src/app/actions/**`

**Description:** Many catch blocks return the raw exception message to the client, e.g.:
```ts
} catch (error: any) {
  console.error('Fetch task messages error:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```
`loginAction` even returns `error.message` on failure.

**Impact:** Raw error messages can leak database schema details, constraint names, file paths, and internal logic to attackers — useful reconnaissance for further attacks.

**Fix:** Log the full error server-side (with a correlation id), but return a generic message to the client (`"Something went wrong"`). Reserve specific messages for expected validation errors that are safe to expose.

#### H-4. Zero automated tests

**Description:** There is **no test suite** — no unit, integration, or end-to-end tests. The only `*.spec.ts` files found are inside `node_modules`. There are ad-hoc root scripts (`test_query.js`, `test_sync.js`, `test_tenant_isolation.js`) but they are manual scripts, not an automated, CI-enforced suite. There is no test runner (Jest/Vitest/Playwright) in `package.json`.

**Impact:** For an app of this size handling money-adjacent data (time tracking, billable hours, hours approvals) and strict tenant isolation, the lack of tests means regressions — especially a tenant-isolation regression — could ship undetected. This is the biggest long-term reliability risk.

**Fix:** Add a test runner and, at minimum, write tests for: (1) authentication and session verification, (2) **tenant isolation** (a user in org A cannot read/write org B's data), (3) org-switching authorization, and (4) the time-tracking/hours-request flows. Wire them into CI so they run on every push.

---

### 🟡 MEDIUM — should fix soon after launch

#### M-1. No security headers or Content-Security-Policy
`next.config.ts` is effectively empty. There is no `headers()` function configuring HSTS, `X-Frame-Options` (clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, or a CSP. **Fix:** Add a `headers()` config with a strict header set and a CSP tuned to the app's asset origins (Cloudinary, Google, etc.).

#### M-2. No input-validation library
There is no `zod` (or equivalent) in the dependency tree. Request bodies are destructured and checked manually (e.g. `if (!content?.trim())`), which is inconsistent and easy to miss. **Fix:** Adopt `zod` and validate/parse every request body and form input at the boundary. This also improves type safety.

#### M-3. Minimal observability / no error monitoring
Observability is limited to **36 `console.log`/`console.error`** calls. There is no Sentry/error-tracking, no structured logging, and no metrics. In production on Vercel, `console.error` output is hard to search and has no alerting. **Fix:** Integrate an error-tracking service (e.g. Sentry) and replace ad-hoc logging with structured logs; strip noisy `console.log`s from hot paths.

#### M-4. Stray development files committed at repo root
`generate_pages.js`, `test_query.js`, `test_sync.js`, `test_tenant_isolation.js`, and a `scratch/` directory sit at the repository root and are part of the deployable tree. Some are gitignored (`test_query.js`, `test_sync.js`) but others are tracked. **Fix:** Move genuine tooling into a `scripts/` folder (excluded from the build) and delete scratch artifacts.

#### M-5. No pinned Node version
`package.json` has no `engines` field. Vercel and local environments may build against different Node versions, risking "works on my machine" build drift. **Fix:** Add `"engines": { "node": ">=20 <21" }` (or the exact version used) and a matching Vercel setting.

#### M-6. README is unmodified create-next-app boilerplate
`README.md` is the default Next.js starter text — no real setup instructions, environment variable documentation, architecture notes, or deployment/runbook guidance. `.env.example` is good for the planner module but does not document `JWT_SECRET`, `DATABASE_URL`, Cloudinary, or email variables. **Fix:** Write a real README (setup, env vars, running locally, deploy steps) and complete `.env.example`.

---

### 🔵 LOW / Minor

- **L-1. Non-timing-safe secret comparison in cron auth.** Cron routes compare the bearer token with `===` (`header === \`Bearer ${secret}\``), which is not constant-time. Low risk over the network, but prefer `crypto.timingSafeEqual`.
- **L-2. Unused import in `proxy.ts`.** `import * as jwt from 'jsonwebtoken'` is imported but the proxy only checks token *presence*, never verifies it. Harmless but dead code (and a reminder that the proxy does not validate tokens — see note below).
- **L-3. Proxy only checks token presence, not validity.** `src/proxy.ts` redirects unauthenticated users away from `/workspace` based on whether the cookie *exists*, not whether the JWT is valid. This is by design (a comment explains it avoids redirect loops after a DB reset) and is safe because each API route/server action independently verifies the session — but it's worth understanding that the proxy is a UX gate, not a security boundary.
- **L-4. Broad use of `any`.** Many catch blocks use `catch (error: any)` and some action signatures accept `any`. Not dangerous but weakens type safety; tightening improves maintainability.

---

## 5. Configuration & Environment Reference

**Environment variables in use** (from `.env` / `.env.example`):

| Variable | Purpose | Status |
|----------|---------|--------|
| `JWT_SECRET` | Signs/verifies session tokens | 🔴 **NOT SET** — falls back to hardcoded value |
| `DATABASE_URL` | PostgreSQL connection | ✅ Set |
| `NEXT_PUBLIC_APP_URL` | Base URL for booking/OAuth links | ✅ Set (local) |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP (nodemailer) | ✅ Set |
| `CRON_SECRET` | Authorizes `/api/cron/*` | ✅ Set |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Transcript analysis | ✅ Set |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Per-org Google OAuth | ✅ Set |
| `CLOUDINARY_*` | Image/screenshot uploads | ✅ Set |
| `NEXT_PUBLIC_MAC_DOWNLOAD_URL` / `_WINDOWS_DOWNLOAD_URL` | Desktop app downloads | ✅ Set |
| `TRANSCRIPT_GIVEUP_MINUTES` / `REMINDER_LEAD_MINUTES` | Planner tuning | Optional |

**Scheduled jobs** (`vercel.json`): meeting reminders every 5 min, transcript polling every 15 min. ⚠️ Note: Vercel's Hobby plan runs crons at most once/day and allows only 2 crons — these schedules require the **Pro plan**.

---

## 6. Pre-Launch Checklist

**Blockers (do not deploy without these):**
- [ ] **C-1** — Set a real `JWT_SECRET` in `.env` + Vercel; remove the hardcoded fallback in `src/lib/auth.ts` and `src/proxy.ts`; add to `.env.example`.

**Before real users:**
- [ ] **H-1** — Add rate limiting to login, signup, forgot-password, and desktop auth.
- [ ] **H-2** — Authenticate Google webhooks with a channel token / signature.
- [ ] **H-3** — Stop returning raw `error.message`; log server-side, return generic client errors.
- [ ] **H-4** — Add a test runner + tests for auth, tenant isolation, and hours/time flows; wire into CI.

**Soon after launch:**
- [ ] **M-1** — Add security headers + CSP in `next.config.ts`.
- [ ] **M-2** — Adopt `zod` for input validation.
- [ ] **M-3** — Add Sentry/error tracking; clean up `console.log`s.
- [ ] **M-4** — Remove stray root scripts / `scratch/`.
- [ ] **M-5** — Pin Node version via `engines`.
- [ ] **M-6** — Write a real README and complete `.env.example`.

**Nice to have:**
- [ ] **L-1** — Constant-time cron secret comparison.
- [ ] **L-2/L-4** — Remove dead imports; tighten `any` usage.

---

## 7. Bottom Line

The **bones of this application are good** — the multi-tenant architecture, authentication design, and consistent tenant scoping are the parts that are genuinely hard to retrofit, and they are already in place. The blockers are mostly **configuration and hardening**, not rewrites. The single critical item (C-1) is a one-line-plus-env-var fix. Once C-1 and the four HIGH items are closed, the app moves from "not safe to launch" to "defensible for a controlled/beta launch," with the MEDIUM items as fast-follows.

**Recommended immediate next step:** Fix C-1 (JWT secret) and the quick wins — security headers (M-1), webhook token (H-2), and error-message hygiene (H-3).
