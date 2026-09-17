# FMS

A family-management backend — user/HOF authentication, family creation and membership, and email verification, being rebuilt from a working prototype into a production-ready service in phases.

This README covers **Phase 0: Foundation**, **Phase 1: Auth & User Domain Rebuild**, **Phase 2: Family Domain Completion**, **Phase 3: Verification & Notifications Hardening**, **Phase 4: Observability, Security & Scalability**, and **Phase 5: Media & E2E Messaging**. See [`docs/phases.md`](./docs/phases.md) for the full roadmap.

## Tech stack

- Node.js (ES modules) + Express 5
- MongoDB + Mongoose
- Redis + BullMQ for the email job queue (optional — see below)
- Socket.IO for real-time message delivery
- Zod for environment and request validation
- Winston for structured logging
- JWT + cookie-based auth
- Jest + Supertest + mongodb-memory-server for testing
- Docker + docker-compose for local dev and deployment

## Project structure

```
apihub-backend/
├── src/
│   ├── app.js                  # Express app assembly (middleware, routes) — no listen()
│   ├── server.js                # Web entry point: env, DB connect, listen, graceful shutdown
│   ├── worker.js                 # Worker entry point: processes the email queue (run separately from server.js)
│   ├── config/                  # env validation, DB, Redis, logger, constants
│   ├── modules/                 # one folder per domain — routes+controller+service+model+validation together
│   │   ├── auth/                 # shared refresh-token rotation, used by users + hof
│   │   ├── users/
│   │   ├── hof/
│   │   ├── family/
│   │   ├── verification/
│   │   └── messaging/            # key directory + encrypted message relay — see docs/messaging.md
│   ├── realtime/                 # Socket.IO server (real-time message delivery)
│   ├── middlewares/              # error handling, auth (consolidated verifyAuth + role-agnostic verifyAnyAccount), validation, rate limiting, uploads, sanitization
│   ├── services/
│   │   ├── mail/                  # SMTP send + HTML templates (called by the worker, not request handlers)
│   │   ├── otp/
│   │   ├── storage/                # Cloudinary
│   │   └── queue/                  # BullMQ producer (email.queue.js) + consumer (email.worker.js)
│   ├── utils/                    # ApiError, ApiResponse, asyncHandler, token + cookie helpers
│   └── routes/index.js           # mounts every module router + health check
├── tests/
│   ├── integration/
│   ├── helpers/
│   ├── env.setup.js              # boots in-memory MongoDB before app code is imported
│   └── lifecycle.setup.js        # per-test cleanup / teardown hooks
├── scripts/seed.js
├── docs/openapi.yaml
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Getting started

### Prerequisites
- Node.js ≥ 18
- MongoDB ≥ 7 (or just use `docker-compose up`, which provides it)
- Redis ≥ 7 — **optional**, only needed if you set `REDIS_URL` to enable the email queue (see [What Phase 3 changed](#what-phase-3-changed)); `docker-compose up` provides it if you want it

### Setup

```bash
npm install
cp .env.example .env   # then fill in real values — see below
```

Required env vars are validated at startup with Zod (`src/config/env.config.js`) — the app **refuses to boot** with a clear error if anything required is missing or malformed, rather than starting in a broken state. Generate strong secrets with:

```bash
openssl rand -hex 32
```

### Run locally

```bash
npm run dev              # web server, nodemon auto-reload
npm run worker           # OPTIONAL: only does anything if REDIS_URL is set — see below
# or, with MongoDB (+ Redis, if you want it) included, both processes:
docker-compose up --build
```

The API is mounted under `/api/v1`. A liveness check is available at `/` and a detailed health check (DB state, memory) at `/api/v1/health`. **Without `REDIS_URL` set, verification emails send synchronously from `npm run dev` and you don't need to run the worker at all.** Set `REDIS_URL` to enable the queue — at that point the worker actually has to be running for emails to send, since the web process only enqueues the job.

### Tests

```bash
npm test
```

Tests use `mongodb-memory-server` to spin up a real (in-memory) MongoDB instance per test run — no external DB needed, and no real Redis needed either (the email queue is mocked at the `enqueueVerificationEmail` boundary — see `tests/helpers/appWithMockedQueue.js`). **Note:** the first run downloads a `mongod` binary, so it needs outbound network access; if you're behind a restrictive proxy/firewall, either allow `fastdl.mongodb.org` or point `MONGOMS_SYSTEM_BINARY` at a locally installed `mongod`.

### Lint & format

```bash
npm run lint          # ESLint
npm run format         # Prettier — auto-fix
```

Both run automatically on staged files via a Husky pre-commit hook.

### API docs

```bash
npm run docs:generate
```

Writes `docs/openapi.json`, generated directly from this codebase's `*.validation.js` Zod schemas (`scripts/generate-openapi.js`) rather than hand-maintained — it describes what the API actually accepts, not what a doc author remembered to update. CI regenerates it on every push and fails the build if the committed file is out of date, so it can't silently drift from the validation logic. Regenerate and commit it whenever you change a validation schema.

## Auth flows

Both the `users` and `hof` modules follow the same pattern:

| Action | User endpoint | HOF endpoint |
|---|---|---|
| Register | `POST /api/v1/members/register-user` | `POST /api/v1/hof/register` |
| Login | `POST /api/v1/members/login-user` | `POST /api/v1/hof/entry` |
| Refresh access token | `POST /api/v1/members/refresh-token` | `POST /api/v1/hof/refresh-token` |
| Logout | `POST /api/v1/members/logout` (auth required) | `POST /api/v1/hof/logout` (auth required) |
| Complete profile | `POST /api/v1/members/complete-profile` (auth required) | `POST /api/v1/hof/complete-profile` (auth required) |

Login sets two `httpOnly` cookies: a short-lived access token (`UaccessToken`/`HaccessToken`, 15m by default) and a longer-lived refresh token (`UrefreshToken`/`HrefreshToken`, 10d by default). The access token is also returned in the response body for clients that prefer an `Authorization: Bearer` header over cookies.

Refresh tokens **rotate on every use** — calling `/refresh-token` invalidates the previous refresh token and issues a new one. Presenting an already-rotated (stale) refresh token is treated as possible token theft and revokes the session, forcing re-login. This is what makes a 15-minute access token workable for a real frontend without asking the user to re-enter credentials constantly.

## Family endpoints

All require an authenticated HOF (`verifyAuth("hof")`) unless noted. `/create` and `/add-member` additionally require the HOF's email to be verified.

| Action | Endpoint |
|---|---|
| Create family | `POST /api/v1/family/create` |
| Add member | `POST /api/v1/family/add-member/:userId` |
| Remove member | `POST /api/v1/family/remove-member/:userId` |
| Member count | `GET /api/v1/family/total-member` |
| List members (paginated) | `GET /api/v1/family/get-all-members?page=&limit=` |
| View as HOF | `POST /api/v1/family/view-hof` |
| View as member | `POST /api/v1/family/view-member` (auth: user, must belong to the family) |
| Revoke a member's verification | `POST /api/v1/verify/revoke-member/:email` (target must be in your family) |
| Revoke your own verification | `POST /api/v1/verify/revoke-hof/:email` (email must match your own) |

## Messaging

**Read [`docs/messaging.md`](./docs/messaging.md) before integrating a client** — it explains the architecture boundary in detail: this backend is a key directory and opaque message relay, not an implementation of the Signal Protocol's cryptographic operations, which belong client-side. tl;dr of the endpoints (all under `/api/v1/messaging`, auth required, work identically for a User or HOF caller):

| Action | Endpoint |
|---|---|
| Publish/replace public keys | `POST /keys` |
| Fetch someone's prekey bundle (to start a session) | `GET /keys/:accountType/:accountId` |
| Send an encrypted message | `POST /messages` |
| Fetch conversation history (paginated) | `GET /messages/:withAccountType/:withAccountId` |
| Mark a message read | `PATCH /messages/:messageId/read` |

Messaging is scoped to members of the same family (reusing the existing family-membership model) — `:accountType`/`:accountId` (or `:withAccountType`/`:withAccountId`) identify the *other* party as `user` or `hof` plus their ID; the caller's own identity comes from their auth token, never from the request. Real-time delivery is over Socket.IO — connect with `auth: { token: <access token> }` in the handshake and listen for `message:new`.

## What Phase 0 changed

This phase focused on infrastructure, not new features or business-logic bug fixes. Concretely:

- Restructured from a flat `controllers/models/routes` layout into feature-based modules.
- Added the **global error-handling middleware** the app was missing — every thrown `ApiError`, Mongoose validation/cast error, duplicate-key error, and JWT error now returns one consistent JSON shape instead of falling through to Express's default error page.
- Centralized and **validated environment configuration** with Zod — the app fails fast at boot instead of running with silently-undefined config.
- Replaced scattered `console.log` calls with structured Winston logging.
- Fixed infrastructure-level bugs uncovered while rebuilding this layer: the health check crashing on an unimported `mongoose` reference, the hardcoded port ignoring `PORT`, and a CORS origin string missing its scheme (`localhost:5173` → `http://localhost:5173` via `CORS_ORIGIN`).
- Added `helmet`, `compression`, a baseline rate limiter, and graceful shutdown handling.
- Added the test harness (Jest + Supertest + mongodb-memory-server), ESLint + Prettier + Husky, a multi-stage production `Dockerfile` + `docker-compose.yml`, and a CI pipeline (lint → format check → test → Docker build).

## What Phase 1 changed

- **Fixed the business-logic bugs** identified in the original review that live in the auth/user/hof/verification path: the `Family` model's `ref: "HOF"` casing mismatch, the temporal-dead-zone bug in `addMembers`, the `field?.trim() === 0` typos (now structurally impossible — replaced by Zod schemas), the broken `User.findOne(user._id)` lookup, and `revoke.controller.js` writing to a field (`isVerified`) that doesn't exist on either schema instead of the real one (`isEmailVerified`). Also found and fixed a bug not caught in the original review: `completeMemberProfile` validated `street`/`city`/`country`/`pincode` but never actually saved them to the user's address.
- **Consolidated the three near-duplicate JWT middlewares** (`verifyMember`, `verifyHof`, and the inconsistent error handling each used) into one role-aware `verifyAuth(role)` factory in `src/middlewares/auth.middleware.js`.
- **Added refresh-token rotation** — access tokens dropped from a 1-day default to 15 minutes, backed by a 10-day refresh token that's hashed at rest, rotated on every use, and revoked on reuse-detection (see [Auth flows](#auth-flows) above). Shared between `users` and `hof` via `src/modules/auth/auth.service.js` rather than duplicated per module.
- **Replaced every manual field-presence check with Zod schemas** (`*.validation.js` per module), wired through the `validate` middleware.
- **Added targeted rate limiting** — a stricter limiter on login/register (`authRateLimiter`) and on OTP send/verify (`otpRateLimiter`), layered on top of the app-wide limiter from Phase 0.
- **Fixed cookies to be environment-aware** — `secure`/`sameSite` now follow `NODE_ENV` instead of hardcoded `secure: true`, which silently broke cookie auth on plain-HTTP local dev.
- **Full test coverage for the auth flows**: registration, login, refresh rotation, reuse-detection, logout, cross-role token isolation, and the OTP verify loop, with the mail service properly mocked (`tests/helpers/appWithMockedMail.js`) so tests don't depend on real SMTP.

**Deliberately not fixed yet** (tracked for Phase 2, since it belongs to the family module and needs family-membership logic): the `isActive`/`is_active` field mismatch in `removeMember`, the `member.relationship` field mismatch in the family view endpoints, and — most importantly — the missing ownership check on the verification-revoke endpoints, which currently let any authenticated HOF revoke verification for any email, not just their own family's members.

## What Phase 2 changed

- **Fixed the remaining field-name mismatches** in the family module: `removeMember` was setting `isActive` (a field that doesn't exist on `User`) instead of `is_active`, so a removed member was never actually marked inactive. The member-list endpoints (`getAllFamilyMembers`, `viewFamilyAsHof`) were populating and returning a `relationship`/`isActive` pair that mapped from nonexistent schema fields — now correctly sourced from `relationship_to_hof` and `is_active`.
- **Fixed the verification-revoke authorization gap** — the single `/revoke/:email/:role` endpoint let any authenticated HOF revoke verification for *any* email in the system. Split into two endpoints with the authorization each case actually needs: `POST /verify/revoke-member/:email` now requires the target to be a member of the calling HOF's own family (`403` otherwise), and `POST /verify/revoke-hof/:email` only allows a HOF to revoke their own verification (there's no admin role yet to justify letting one HOF revoke another's).
- **Added Zod validation** to every family route (`createFamilySchema`, `familyMemberParamsSchema` for `:userId` params, `paginationSchema` for list queries) — the family module was the last one still relying on the pre-Phase-1 manual `field?.trim()` checks.
- **Added pagination** to `GET /family/get-all-members` (`?page=&limit=`, capped at 100/page), returning `totalMembers`/`totalPages`/`hasNextPage`/`hasPrevPage` alongside the page of members.
- **Brought family-module error handling in line with the rest of the app** — removed the manual try/catch-into-500 pattern (including one spot that passed an `Error` object as `ApiError`'s `message`, which expects a string) now that the global error handler from Phase 0 can be trusted to catch everything.
- **Closed a data-integrity gap found during the rebuild, not in the original review**: `createFamily` had no check preventing a HOF from creating a second family — since `Hof.family_created` only stores one reference, a second call would silently orphan the first `Family` document. Now returns `409` if the HOF already has one.
- **Full test coverage** for family creation, membership (add/remove), pagination, and — most importantly — the revoke-authorization fix itself (`tests/integration/family.test.js` includes a test that a HOF *cannot* revoke verification for a user outside their family, and cannot revoke another HOF's verification).

## What Phase 3 changed

- **Moved email off the request/response cycle.** `registerUser` and `sendVerificationOTP` used to block on a live SMTP round-trip before responding. They now call `enqueueVerificationEmail()`, which adds a job to a BullMQ/Redis queue and returns — the actual send happens in a separate worker process (`npm run worker` / `src/worker.js`), with automatic retries (3 attempts, exponential backoff) if SMTP is temporarily down.
- **Redis is optional, not required.** If `REDIS_URL` isn't set, `enqueueVerificationEmail()` falls back to sending synchronously (the pre-Phase-3 behavior) — no connection is attempted, no background retries, nothing. `npm run worker` detects this and exits immediately with a clear message rather than idling with nothing to consume. This means the app runs with zero infrastructure beyond MongoDB by default; Redis is an opt-in scalability improvement you enable by setting one env var.
- **Extracted the email HTML into a real template** (`src/services/mail/templates/otp-verification.html`) rendered through a small dependency-free `renderTemplate()` utility, instead of an inline template literal in `mail.service.js`. The "expires in N minutes" text is no longer a second hardcoded copy of the number in `otp.service.js` — both now read from one `OTP_EXPIRY_MINUTES` constant.
- **Two production-hardening gaps fixed that weren't in the original review**, found while building this: ioredis crashes the whole process on an unhandled `error` event if nothing's listening for it — every Redis-touching module now has a listener, plus a capped backoff (`retryStrategy`) so a Redis outage logs sanely instead of reconnecting in a tight loop. Separately, nodemailer has no connection timeout by default, so an unreachable SMTP server would hang a worker slot indefinitely instead of failing into the retry policy — added explicit `connectionTimeout`/`greetingTimeout`/`socketTimeout`. I confirmed this one for real: with no SMTP reachable, the worker now fails cleanly in ~10.5s instead of hanging.
- **`docker-compose.yml`** gained `redis` and `worker` services. The worker runs as its own container from the same image, deployable and scaled independently of the web tier — the actual point of moving to a queue in the first place.
- **Test mocking boundary moved with the code**: since requests now enqueue rather than send, the shared test helper (`appWithMockedMail.js` → `appWithMockedQueue.js`) mocks `enqueueVerificationEmail` instead of `sendVerificationEmail`. The worker's own job-processing logic (`processEmailJob`) is unit-tested separately with the mail service mocked, without ever constructing a real Redis connection or BullMQ Worker.

**Redis was made fully optional after this phase shipped** (folded into this delivery once flagged): `REDIS_URL` has no default now — if it's unset, `isRedisEnabled` is `false`, `enqueueVerificationEmail` falls back to sending synchronously, and `npm run worker` exits immediately with a clear message instead of idling with nothing to consume. No Redis connection is attempted at all in that mode — not even a background retry. This means the app runs with zero infrastructure beyond MongoDB by default, and Redis becomes an opt-in scalability improvement enabled by setting one env var.

## What Phase 4 changed

- **Security middleware — with a real, tested finding, not a guess.** I tested `express-mongo-sanitize` directly against this app's Express 5 before adopting it, and it **crashes on every request with a query string**: Express 5 made `req.query` a getter with no setter, and that package still reassigns it directly (`TypeError: Cannot set property query... which has only a getter`). `hpp` doesn't crash but silently no-ops on `req.query` for the same underlying reason (verified — parameter deduplication just doesn't happen there). Rather than ship either as-is:
  - Wrote a custom `sanitize.middleware.js` that strips `$`-prefixed and dot-containing keys from `req.body`/`req.params` (both confirmed still safely mutable under Express 5) — this is what actually replaces `express-mongo-sanitize`'s job.
  - Kept `hpp()` for what it still does correctly: deduplicating polluted parameters in `req.body` (confirmed working). Query-string parameter pollution is instead handled by the fact that every query param in this app is typed and coerced through a Zod schema, which rejects an array where a scalar is expected.
- **Request-ID correlation**: every request gets an `X-Request-Id` (honoring an inbound one from a reverse proxy if present), threaded through Morgan's access log and the global error handler's log line and JSON response — so a client-reported error can be grepped straight to the matching log entry.
- **Redis-backed caching for the family module's genuinely expensive reads** (`getAllFamilyMembers`, `viewFamilyAsHof`, `viewFamilyAsMember`) — deliberately *not* applied to `getMembersCount`, which is already a cheap single-document read where caching would add complexity for no real benefit. Uses a version-counter invalidation scheme (`src/utils/cache.util.js`): every cached read for a family embeds a version number in its key, and `addMembers`/`removeMember` bump that single counter on write, which invalidates every previously-cached page/view for that family in one O(1) call instead of needing to enumerate every paginated key combination. Built on the same optional Redis connection from Phase 3 — with no `REDIS_URL` set, every cache read is a clean miss and the endpoint just hits the DB directly, same as before this phase.
- **OpenAPI spec generated from the actual Zod schemas** instead of hand-maintained YAML (which is now deleted) — see [API docs](#api-docs) above. Verified by actually running the generator against every route, not just written and assumed to work; caught and fixed a real peer-dependency mismatch in the process (`@asteasolutions/zod-to-openapi`'s latest major version requires Zod 4, this app is on Zod 3 — pinned to the last Zod-3-compatible release, `7.3.4`, instead of installing something that would have crashed on import).

## What Phase 5 changed

**Read [`docs/messaging.md`](./docs/messaging.md) first** — it's the important part of this phase. Short version: this backend implements the server-side half of E2E messaging (a key directory + opaque ciphertext relay), not the Signal Protocol's cryptographic operations, which have to live client-side for the system to actually be end-to-end encrypted. My own earlier phase-planning language ("implement Signal Protocol key exchange... on the backend") was imprecise about this boundary — worth correcting explicitly rather than building the wrong thing.

- **Key directory**: `identityKey`/`registrationId`/`signedPreKey` fields added to both `User` and `Hof` (shared via `identityKey.schema.js` rather than duplicated), plus a separate `OneTimePreKey` collection — there are many per account, and each has to be handed out (and atomically deleted) exactly once. Verified the atomicity directly: fetching a bundle twice in a row returns the same one-time prekey exactly once, `null` on the second call, never a repeat.
- **Message relay**: `Message` model storing `ciphertext` as an opaque blob — nothing in this codebase parses or inspects it. Scoped to same-family messaging, authorized via a new `assertSameFamily` check that resolves the caller's family entirely from their own authenticated identity, never from a client-supplied family ID.
- **New role-agnostic auth**: `verifyAnyAccount` middleware, since messaging logic is identical whether the caller is a User or a HOF (unlike the rest of the app, which duplicates flows per role by design). Normalizes onto `req.account = { type, id, doc }`. Refactored the token-resolution logic `verifyAuth` already had into a shared helper both now call, rather than duplicating it a third time.
- **Real-time delivery**: Socket.IO, JWT-authenticated at the handshake (reusing the same access tokens issued at login), rooms scoped per-account. `server.js` now wraps `app` in a raw `http.Server` so Socket.IO can attach alongside Express. Verified for real — not mocked — with an actual local client: connection without a token is rejected, a valid token connects and joins the right room, a pushed message reaches the connected client, and critically, a message pushed to a *different* account's room does **not** leak to this one.
- **What's explicitly not done, on purpose**: signed-prekey signature verification (needs the real `@signalapp/libsignal-client` or a careful XEdDSA implementation — not something to hastily vendor; see docs/messaging.md), delivery receipts (only read receipts are tracked), and group messaging. All flagged rather than silently skipped.

## License

MIT
