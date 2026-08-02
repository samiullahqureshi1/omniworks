# Technical & Product Due Diligence — omniwork / omnitrack

**Prepared for:** Founder / prospective investors & enterprise buyers
**Reviewer role:** Senior SaaS Product Architect · CTO · UX · DevOps · Security · PM · Startup Advisor
**Date:** 2026-08-02
**Basis:** Direct source-code review of the repository (not marketing claims). Stack: Next.js 16.2.9 (App Router, Turbopack) · React 19 · Prisma 7.8 · PostgreSQL · Vercel · Cloudinary · Google OAuth/Meet · Gemini · Electron desktop app.

> **One-line verdict:** A genuinely feature-rich, well-architected-at-the-core work-management SaaS with strong multi-tenant fundamentals — but **not yet production/enterprise ready** due to one critical auth flaw, missing hardening (rate limiting, validation, monitoring), no tests, no billing, and infrastructure gaps (no Redis/queue, per-instance realtime) that cap it at low-hundreds of concurrent users today.

---

## 1. Product Overview

**What type of SaaS is this?**
A horizontal, **all-in-one Work Management / Team Collaboration platform** (the "ClickUp/Monday" category) — project & task management with multiple views (Kanban/List/Table/Calendar), time tracking with screenshots + activity monitoring, team & project chat, notes/documents, a meetings/planner module (Google Calendar + Meet + AI transcript analysis), IFTTT-style automation rules, notifications, RBAC, and a companion **desktop time-tracking app** (Electron). Multi-tenant with a notable **multi-organization identity model** (one email = one person across many orgs, each with its own role).

**Which industries can use it?**
Agencies (design/dev/marketing), software teams, professional services/consultancies, BPO/outsourcing (the screenshot + activity-tracking + client-role features strongly signal **agencies managing external clients** and **remote/monitored teams**). Also usable by startups and SMB operations teams.

**Ideal Customer Profile (ICP):**
- **Primary:** 10–150-seat digital agencies & outsourcing firms that bill clients by hours, need proof-of-work (screenshots/activity), and collaborate with clients inside the tool (there is a dedicated `CLIENT` role with restricted visibility).
- **Secondary:** Remote-first SMBs wanting one tool instead of Asana + Toggl + Slack + Calendly.

**Market positioning:**
"**One workspace to run client work end-to-end** — plan, track time (with proof), meet, and get paid-ready reports — without stitching five tools together." The time-tracking-with-screenshots + client portal + meeting AI is the differentiated wedge vs. generic PM tools.

---

## 2. Feature Analysis (module by module)

Legend: 💪 strength · ⚠️ gap · 🏢 enterprise-readiness note

| Module | Assessment |
|---|---|
| **Workspace / Multi-org** | 💪 Real multi-tenant model; email-as-person across orgs; org-switch re-mints session. ⚠️ Org context lives in a JWT + cookie override — no server-enforced tenant guard middleware (each query must remember `organizationId`; mostly done well, but one missed filter = cross-tenant leak). 🏢 Needs SSO/SCIM, workspace-level audit. |
| **Team Management** | 💪 Roles (OWNER/MEMBER/CLIENT/MASTER_ADMIN), invitations, presence. ⚠️ No custom roles / granular permission matrix; roles are hard-coded enums. 🏢 Enterprises need custom roles & permission sets. |
| **Project Management** | 💪 Statuses, priorities, assignees, milestones, templates, custom fields, rules, hours budgeting. Rich. ⚠️ No dependencies/Gantt, no portfolio/rollup across projects. |
| **Task Management** | 💪 Custom fields, repeat/recurring, templates, mentions, attachments (Cloudinary), multi-create. ⚠️ No subtasks hierarchy visible, no task dependencies, no bulk edit. |
| **Kanban / List / Table views** | 💪 Three real views with dnd-kit drag/drop. ⚠️ Large boards will need virtualization (none detected) → jank at 500+ cards. |
| **Calendar / Planner** | 💪 Planner module with events, meetings, contacts, booking pages (`/book/[slug]`). Ambitious. ⚠️ Timezone correctness is a classic risk area — needs audit. |
| **Time Tracking** | 💪 Active timers, manual entries, idle detection, **screenshots**, activity % (keystrokes/mouse via `ActivityLog`), timesheets, hours-request approval. This is the standout module. ⚠️ Screenshot storage/retention/privacy policy & consent flows needed. 🏢 GDPR/monitoring-consent is a legal must for enterprise. |
| **Conversations (team & project)** | 💪 Project/task messages, chat groups, mentions, read receipts, visibility levels (public vs internal for clients). ⚠️ Realtime is **SSE + polling**, in-memory per instance — see §7/§10. No message search, no edit history. |
| **Notes / Documents** | 💪 TipTap rich text, FILE + DOC document types, per project/task. ⚠️ **Hard delete** (no version history, no trash/restore). |
| **Meeting Scheduling + Notes** | 💪 Per-org Google OAuth, Meet creation, cron-based reminders, **Gemini transcript analysis** → meeting notes. Impressive scope. ⚠️ Webhooks are **unauthenticated** (spoofable) — see §8. Depends on Vercel cron (Hobby plan runs crons ~once/day). |
| **Automation (IFTTT)** | 💪 Rule / ProjectRule / RuleLog models exist. ⚠️ Executed inline (no queue/worker) → limited throughput & no retries. |
| **Notifications** | 💪 In-app notifications + read state, email via nodemailer. ⚠️ No digest/batching, no push, no per-user preference center detected. |
| **Roles & Permissions** | 💪 Enforced in server actions/routes by role + org. ⚠️ Coarse-grained; no field/record-level permissions. |
| **Activity Logs** | ⚠️ **`ActivityLog` is time-tracking telemetry (keystrokes/mouse), NOT a generic audit trail.** There is **no "who changed what, when" audit log** for projects/tasks/settings — an enterprise blocker. |

**Cross-cutting gaps:** No billing/subscription enforcement (no Stripe), no reporting/BI export beyond basic reports, no public API, no mobile app (web + Electron desktop only), no data import/migration tooling.

---

## 3. UX / UI Review

- **Visual design:** 💪 Modern, cohesive — Radix UI primitives + Tailwind v4, dark mode, Framer Motion, Sonner toasts, lucide icons. Looks like a premium product.
- **Navigation:** 💪 Clear left-rail modules (Dashboard/Projects/Tasks/Timesheet/Users/Clients) + pinned chats/tasks. Good IA for the domain.
- **Onboarding:** ⚠️ Signup creates org + default stages automatically (good), but **no guided onboarding / empty states / sample data / product tour** observed. First-run experience is a likely drop-off point.
- **Usability / workflows:** 💪 Powerful modals (task/project create with templates, custom fields, attachments). ⚠️ The create/edit modals are **very dense** (2-column grids at 820–860px). At narrow widths the grid **overlaps/collapses** (observed live) — mobile web is not usable for these modals.
- **Accessibility:** ⚠️ Radix gives keyboard/ARIA basics for free, but no evidence of an a11y pass (focus management in custom popovers, color-contrast, `aria-*` on custom controls). Assume **not WCAG-audited**.
- **Consistency:** 💪 Shared components (ModalTabsHeader, FormDialog, CloudinaryAttachmentCard) drive consistency. ⚠️ Some duplicated patterns (two project modals; attachment logic recently unified into one component).
- **Mobile responsiveness:** ⚠️ Marketing pages likely fine; **the app’s data-dense modals and boards are desktop-first** and break on small screens. No React Native/mobile app.

**Top UX fixes:** responsive modal layouts, first-run onboarding + empty states, board virtualization, a notification/preferences center.

---

## 4. Technical Architecture Review

**Current (as built):**
```
                         ┌───────────────────────────┐
   Browser (React 19)    │  Vercel (Next.js 16)      │
   Electron desktop app  │  ─ App Router pages       │
        │  ▲             │  ─ Server Actions (23)    │        ┌────────────┐
        │  │  SSE/poll   │  ─ API routes (40)        │──pg────│ PostgreSQL │
        ▼  │             │  ─ proxy.ts (auth gate)   │  Pool  │ (Prisma 7) │
   ── HTTPS ────────────▶│  ─ Cron (vercel.json)     │  (20)  └────────────┘
                         └───────┬───────────────────┘
                                 │ external
                 ┌───────────────┼───────────────┬───────────────┐
              Cloudinary     Google OAuth/     Gemini API      SMTP
              (uploads)      Calendar/Meet    (transcripts)  (nodemailer)
```

**What's good:** Clean server-action + per-route `getSession()` pattern; consistent `organizationId` tenant scoping; pooled Prisma via `@prisma/adapter-pg`; per-org OAuth (smart choice for personal-Gmail orgs).

**What's missing / risks for an "ideal" architecture:**

| Layer | Current | Recommendation |
|---|---|---|
| **Next.js** | ✅ App Router, Turbopack, strict TS, build clean | Add `next.config` security headers, image domains, output tracing; move heavy work off request path |
| **PostgreSQL** | ✅ Prisma + pg Pool (max 20) | On serverless, 20 connections/instance × many instances → **connection exhaustion**. Use a **pooler (PgBouncer/Neon/Supabase pooler)** or Prisma Accelerate |
| **Prisma** | ✅ v7, adapter-pg | Add query logging/metrics; watch N+1; consider read replicas later |
| **Redis** | ❌ none | **Add** — for rate limiting, sessions/cache, SSE pub/sub fan-out, presence, queue backing |
| **WebSockets** | ❌ (SSE only, in-memory) | Move realtime to a managed service (Pusher/Ably) or Redis-backed SSE/WS; current SSE **does not fan out across serverless instances** |
| **Queue System** | ❌ none | **Add** (BullMQ+Redis, or QStash/Inngest) for automations, emails, transcript polling, notifications |
| **Background Jobs** | ⚠️ Vercel cron only | Use a real scheduler/worker (Inngest/Trigger.dev) — Vercel Hobby cron ≈ once/day |
| **Object Storage** | ✅ Cloudinary (unsigned preset) | Move to **signed/authenticated uploads**; validate type/size server-side; consider S3+CDN for cost at scale |
| **CDN** | ✅ Vercel edge for static | Fine |
| **Authentication** | ✅ JWT httpOnly cookie + bcrypt + 2FA | **Fix hardcoded secret (see §8)**; consider a battle-tested lib (Auth.js/Lucia) or short-lived access + refresh rotation |
| **Authorization** | ⚠️ role checks per handler | Centralize into a policy layer (CASL-style) to avoid missed checks |
| **Multi-tenancy** | ✅ `organizationId` column scoping | Add a **defense-in-depth guard** (Prisma middleware / RLS) so a forgotten `where` can't leak tenants |

---

## 5. Database Design Review

**Current state (good bones):** 50+ models, **60 indexes/unique constraints**, **106 `onDelete` cascade rules**, UUID PKs, enums for roles/priority/status. This is a **well-constrained schema** — better than most early-stage SaaS.

**Recommendations:**

- **Table structure / relationships:** Largely sound (Organization → Users/Projects/Tasks/TimeEntries, join tables for assignees). Keep composite tenant indexes: add `@@index([organizationId, <hotColumn>])` on Task, ProjectMessage, TimeEntry, Notification, ActivityLog (query patterns are always org-scoped).
- **Indexes:** Verify indexes exist on every FK used in filters and on `(organizationId, createdAt)` for list/pagination. `ActivityLog` (keystrokes stream) and `TimeScreenshot` will grow fastest — index and partition by time.
- **Foreign keys / constraints:** ✅ cascades present. Audit that cascade deletes are intended (cascading a User delete could wipe history — prefer restrict + soft delete for Users).
- **Performance:** Add partial indexes for "active" rows; consider **table partitioning** for `ActivityLog`, `TimeScreenshot`, `Notification` once they hit millions of rows.
- **Soft delete:** ⚠️ **Not systematic** — only one `deletedAt` field in the whole schema; there are **~40 hard-delete calls**. Enterprises expect trash/restore + retention. Add `deletedAt` to Project/Task/Document/Message and filter globally (Prisma extension).
- **Audit logs:** ⚠️ **No generic audit trail.** Add an `AuditEvent` table (`actorId, org, entity, entityId, action, before, after, ip, at`) written via a Prisma extension for all mutations. Enterprise/SOC2 requirement.

---

## 6. API Review

**Current:** Mix of **Server Actions (23)** for mutations + **REST-ish route handlers (40)** for fetch/webhooks/uploads. Auth via `getSession()` per handler; tenant scoping by `organizationId`. Manual body parsing.

| Concern | Status | Recommendation |
|---|---|---|
| **Versioning** | ❌ none | Namespace public API under `/api/v1/*` before exposing externally |
| **Rate limiting** | ❌ **none anywhere** | Add per-IP + per-user limits (Upstash) on auth, uploads, webhooks, all mutations |
| **Validation** | ⚠️ manual, inconsistent | Adopt **zod** at every boundary (bodies, params, forms) |
| **Error handling** | ⚠️ **`error.message` returned to client in ~37 places** | Log server-side + return generic messages; add error codes |
| **Pagination** | ⚠️ many `findMany` without limits | Cursor pagination on all list endpoints |
| **Filtering/Search** | ⚠️ basic | Add server-side filter DSL; Postgres FTS or Meilisearch/Typesense for search |
| **Security** | ⚠️ webhooks unauthenticated; unsigned uploads | Verify webhook tokens; signed uploads; CSRF review for cookie-based mutations |

---

## 7. Performance Analysis

- **Database:** Pool max 20/instance — fine single-instance, **risky on serverless** (use a pooler). Watch N+1 in deeply-included Prisma queries (messages with mentions/tasks).
- **Query optimization:** Add the composite `(organizationId, …)` indexes; measure with `EXPLAIN ANALYZE` on task/timesheet/report queries.
- **Caching:** ❌ **No caching layer.** Add Redis for hot reads (org settings, statuses, user lists) and Next.js `revalidateTag`/data cache where safe.
- **Lazy loading / code splitting:** Next App Router gives route-level splitting; ⚠️ the huge client components (`ProjectsClient` ~6k lines, task modal ~2.4k) ship large JS — split modals via `next/dynamic`.
- **Bundle optimization:** Audit with `@next/bundle-analyzer`; framer-motion + recharts + tiptap are heavy — lazy-load.
- **Realtime:** SSE stream is **in-memory per instance** → on Vercel it won't broadcast across instances; presence uses polling (observed frequent `POST /api/presence`).

**Concurrent-user outlook (today, unoptimized):**

| Users | Expectation |
|---|---|
| **100** | ✅ OK |
| **500** | ⚠️ Connection pressure, SSE/polling load, slow boards — degradation likely |
| **1000** | ❌ Needs pooler + Redis + queue + realtime service first |
| **5000** | ❌ Requires the §10 re-architecture |

---

## 8. Security Audit

| Area | Finding | Severity |
|---|---|---|
| **Authentication** | JWT in httpOnly+secure+sameSite cookie, bcrypt(10), 2FA (speakeasy) — good design | — |
| **🔴 JWT secret** | **Hardcoded fallback `'omnitrack-super-secret-jwt-key-2026'` and `JWT_SECRET` is not set in any env file** → anyone can forge sessions for any org/user | **CRITICAL** |
| **Authorization / RBAC** | Enforced per-handler by role + org; consistent but decentralized (easy to miss) | Medium |
| **Session mgmt** | 7-day JWT, no refresh rotation, no server-side revocation list | Medium |
| **CSRF** | Cookie-based auth + server actions/POST — needs explicit CSRF review/tokens for state-changing routes | High |
| **XSS** | TipTap/rich text + `dangerouslySetInnerHTML` seen in task description render → **sanitize server-side** | High |
| **SQL injection** | Prisma parameterizes — low risk ✅ | Low |
| **File upload** | Cloudinary **unsigned** preset; no server-side type/size limits → abuse/malware vector | High |
| **Rate limiting** | **None** → brute force, enumeration, DoS | High |
| **Info disclosure** | Raw `error.message` to clients (~37) | Medium |
| **Webhooks** | Google webhooks **unauthenticated** (spoofable) | High |
| **Encryption** | TLS to DB (rejectUnauthorized) ✅; Google refresh tokens stored in DB — should be **encrypted at rest (KMS)** | Medium |
| **Secrets mgmt** | `.env` gitignored & never committed ✅; but secret hygiene undermined by the JWT fallback | — |
| **Security headers/CSP** | `next.config.ts` empty → no HSTS/CSP/X-Frame-Options | Medium |

**Must-fix before launch:** JWT secret (#1), rate limiting, webhook auth, signed uploads + server-side validation, HTML sanitization, security headers, stop leaking error messages.

---

## 9. DevOps Review

Current: Vercel deploy, `prisma generate && next build`, Vercel cron. **No CI, no tests, no monitoring, no error tracking.**

| Area | Recommendation |
|---|---|
| **CI/CD** | GitHub Actions: typecheck + lint + test + `prisma migrate` on PR; preview deploys (Vercel already) |
| **Docker** | Provide a Dockerfile for portability/self-host (enterprise ask) even if Vercel is primary |
| **Kubernetes** | Not needed now; revisit only if leaving serverless at 5k+ users |
| **PM2** | Only relevant if self-hosting Node; N/A on Vercel |
| **Monitoring** | Add **Sentry** (errors) + **Vercel Analytics/OpenTelemetry**; app has only 36 `console.log`s |
| **Logging** | Structured logs (pino) with request/tenant correlation ids |
| **Grafana/Prometheus** | Add once on dedicated infra; use hosted (Grafana Cloud) meanwhile |
| **Backups** | Managed Postgres PITR (Neon/Supabase/RDS); test restores |
| **Disaster recovery** | Documented RTO/RPO, multi-AZ DB, Cloudinary redundancy, runbook |

---

## 10. Scalability Analysis

```
 100 users   → Current stack OK. Fix security. Add Sentry.
 500 users   → Add: PgBouncer/pooler, Redis (cache + rate limit),
               replace in-memory SSE with Redis pub/sub or Pusher/Ably.
1000 users   → Add: queue (BullMQ/Inngest) for automations/emails/transcripts,
               background workers, board virtualization, cursor pagination everywhere.
5000 users   → Add: read replicas, search service (Typesense/Meilisearch),
               partition ActivityLog/TimeScreenshot, CDN for media,
               per-tenant usage metering + billing enforcement.
50000 users  → Consider: dedicated services for realtime & jobs, sharding/
               Citus or per-region DB, cell-based multi-tenancy, RLS,
               SOC2 controls, dedicated data pipeline for reporting/BI.
```

Biggest structural blockers to scale **in order**: (1) in-memory SSE, (2) no Redis, (3) no queue/worker, (4) serverless DB connection model, (5) no caching.

---

## 11. AI Opportunities (ranked)

You already ship **Gemini meeting-transcript analysis** — strong foundation. Priority for the rest:

| Rank | Feature | Why | Effort |
|---|---|---|---|
| **1** | **AI Meeting Summary + action items → auto-create tasks** | You have transcripts already; closes plan→execute loop | Low |
| **2** | **AI Task Assistant** (draft descriptions, subtasks, estimates) | High daily value, low risk | Low |
| **3** | **AI Search / "ask your workspace"** (RAG over tasks/docs/chat) | Killer retention feature; needs vector store (pgvector) | Med |
| **4** | **AI Project Summary / status digest** | Great for managers/clients; scheduled | Low-Med |
| **5** | **AI Reports** (natural-language → charts on time/hours) | Monetizable premium tier | Med |
| **6** | **AI Automation builder** (describe a rule → generate IFTTT config) | Leverages existing Rule engine | Med |
| **7** | **AI Chat copilot in conversations** | Nice-to-have | Med |
| **8** | **AI Planning** (auto-schedule tasks to calendar) | Complex, correctness-sensitive | High |

Start with #1–#2 (weeks), gate #3–#5 behind a paid tier.

---

## 12. Competitor Analysis

| Capability | **omniwork** | ClickUp | Asana | Monday | Jira | Notion | Trello |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Tasks + multi-view (Kanban/List/Table/Cal) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Time tracking + screenshots/activity** | ✅ | ⚠️(basic) | ❌ | ⚠️ | ⚠️ | ❌ | ❌ |
| Team + project chat | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ❌ |
| Docs/notes (rich text) | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ |
| Meetings + AI transcript notes | ✅ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| Automation (IFTTT) | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Client portal / client role** | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| Public API / integrations | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mobile apps | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSO/SAML/SCIM | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Billing/subscriptions | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enterprise security (SOC2 etc.) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Takeaway:** Feature breadth already rivals the incumbents in the *product* dimension; the gaps are **platform maturity** (API, mobile, SSO, billing, compliance), not features. Your **wedge = agency/outsourcing (time-proof + client portal + meeting AI)** where the big players are weak.

---

## 13. Missing Enterprise Features

- SSO (SAML/OIDC) + SCIM provisioning
- Custom roles & granular permissions (field/record-level)
- **Generic audit log** (who did what, when) + export
- **Billing/subscriptions + plan enforcement/metering** (no Stripe today)
- Data residency, encryption of stored 3rd-party tokens (KMS), retention policies
- Soft delete / trash / restore + data export & GDPR delete
- Public REST/GraphQL API + webhooks (outbound) + Zapier
- Admin console (usage, seats, security policies), IP allowlist, session revocation
- Uptime SLA, status page, SOC2/ISO roadmap
- Mobile app; accessibility (WCAG) conformance

---

## 14. SaaS Readiness Score (1–10)

| Area | Score | Rationale |
|---|:--:|---|
| **Product** | 7 | Broad, differentiated (time-proof + meetings AI + client role); missing API/mobile/billing |
| **UI** | 7 | Polished, consistent; weak mobile/responsive & onboarding |
| **Security** | 3 | Critical JWT flaw + no rate limit/webhook auth/validation |
| **Performance** | 5 | Fine small-scale; no cache/pooler; per-instance realtime |
| **Scalability** | 4 | No Redis/queue; serverless DB & realtime ceiling |
| **DevOps** | 3 | No CI/tests/monitoring/backup docs |
| **Architecture** | 6 | Clean multi-tenant core; missing infra layers |
| **Documentation** | 2 | Boilerplate README; no runbooks/API docs |
| **Business Readiness** | 5 | Marketing/legal/pricing pages exist; no billing, no compliance |
| **Overall** | **4.7 / 10** | Strong product, immature platform |

---

## 15. Launch Readiness

**Is it production-ready?** Not yet — for a controlled/beta launch it's close *after* the blockers; for enterprise it needs the §13 roadmap.

**🔴 Blockers (do not launch):**
1. Set real `JWT_SECRET` + remove hardcoded fallback.
2. Rate limiting on auth/uploads/webhooks/mutations.
3. Authenticate Google webhooks; signed Cloudinary uploads + server-side file validation.
4. Sanitize rich-text/HTML (XSS); stop returning raw error messages.
5. Add Sentry + basic monitoring; add security headers/CSP.

**🟠 High priority:**
- zod validation everywhere; cursor pagination on lists; automated tests + CI; connection pooler; encrypt stored Google tokens.

**🟡 Medium:**
- Redis cache + rate-limit store; move realtime to Redis/managed; queue for automations/emails/transcripts; soft delete + trash; generic audit log; onboarding/empty states; responsive modals.

**🟢 Optional:**
- Public API, mobile app, AI features (§11), advanced reporting/BI, SSO/SCIM.

---

## 16. Investment Review (as a VC)

**Would I invest? — Conditional yes (seed), not yet at the current state.**

- **Bull case:** Rare combination of *shipped* breadth + a real wedge (agencies/outsourcing: time-proof, client portal, meeting AI). Solid engineering instincts (clean multi-tenancy, strict TS, constrained schema, 2FA). A founder who can build this much is fundable.
- **Bear case:** No revenue mechanism (no billing), one critical security hole, no tests/monitoring, infra that caps scale, and it's the most crowded category in software (ClickUp/Asana/Monday/Jira). Differentiation must be enforced by focus, not feature-parity.
- **Terms I'd want before a check:** fix the 5 blockers, stand up billing, show **10–20 paying agencies** and retention, and a crisp ICP/GTM. Then it's a credible seed in a vertical-SaaS framing ("Work OS for agencies").

**Decision:** *Pass today; strong maybe at a $X seed once security + billing + 10 paying customers are in place.*

---

## 17. Roadmap

**Next 30 days — "Make it safe & measurable"**
- Fix JWT secret; rate limiting; webhook auth; signed uploads; HTML sanitize; error-message hygiene; security headers.
- Add Sentry + structured logging; write smoke/integration tests (auth, tenant isolation, time/hours) + CI.
- Integrate **Stripe** billing + plan gating (unblocks revenue).

**Next 90 days — "Make it scale & sell"**
- Redis (cache + rate limit + SSE pub/sub or Pusher/Ably); connection pooler; cursor pagination; board virtualization.
- Queue + workers (automations, emails, transcript polling) via Inngest/BullMQ.
- Soft delete + trash; generic audit log; onboarding + empty states; responsive modal fixes.
- Ship AI #1–#2 (meeting→tasks, task assistant).

**Next 6 months — "Make it enterprise-credible"**
- SSO (SAML/OIDC) + SCIM; custom roles/permissions; admin console; encryption of stored tokens (KMS).
- Public API v1 + outbound webhooks + Zapier; search service; AI search/reports (paid tier).
- Backups/DR runbook; start SOC2 Type I.

**Next 12 months — "Make it a platform"**
- Mobile app; read replicas + partitioning; per-tenant metering; marketplace/integrations; WCAG conformance; SOC2 Type II; regional data residency.

---

## 18. Overall Verdict (brutally honest)

**Biggest strengths**
- Genuinely broad, coherent product that already competes on *features* with billion-dollar tools.
- A real, defensible **wedge** (agencies/outsourcing: proof-of-work time tracking + client portal + AI meetings).
- Strong engineering core: correct multi-tenant scoping, strict TypeScript, clean build, well-constrained schema, 2FA — better fundamentals than most pre-seed products.

**Biggest weaknesses**
- **One critical auth vulnerability** (hardcoded/unset JWT secret) that invalidates all other security until fixed.
- **Zero tests, no monitoring, no CI** — you can't safely change a codebase this large blind.
- **No billing** — it's not yet a business, it's a product.
- Documentation is effectively absent.

**Technical risks**
- In-memory realtime + no Redis/queue + serverless DB pooling → hard scaling ceiling around a few hundred concurrent users.
- Decentralized authorization (a single forgotten `organizationId` filter = cross-tenant breach); add defense-in-depth.
- Third-party dependence (Cloudinary unsigned, Google webhooks unauthenticated, Vercel cron limits).

**Business risks**
- Brutally competitive category; "all-in-one" is a graveyard unless you win a niche. Focus beats breadth.
- No monetization or usage data yet; feature sprawl can outrun the team's ability to harden.

**Market opportunities**
- "**Work OS for agencies/outsourcing**": bill-ready time proof + client collaboration + AI meeting-to-task. Underserved by incumbents. Layer AI as the premium tier.

**Final recommendation**
You have built the hard 70% (a broad, credible product). Now do the unglamorous 30% that turns it into a company: **fix the security blockers, add billing, add tests + monitoring, pick one ICP (agencies), and get 10–20 paying customers.** Do that in the next 90 days and this becomes genuinely fundable and launch-ready. Ship-worthy for a **private beta after the 5 blockers**; enterprise-ready only after §13.

---

*This report is based on static source-code review and live inspection of the running app in this session. It is not a penetration test or formal audit; a professional pen-test and a SOC2 readiness assessment are recommended before enterprise sales.*
