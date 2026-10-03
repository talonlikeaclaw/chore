<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# Project Handoff — Chore Manager

Self-hosted household chore tracker. Households have rooms; rooms have chores with a recurrence interval; members mark chores done, and completions record who and when. Due/overdue are **calendar days in the household's IANA timezone**, not durations. Real-time updates over Socket.io.

Developed with AI coding agents, directed and reviewed by a human who commits, tags, and deploys. This file is the handoff doc: keep it current — delete stale lines instead of appending history.

## Working style

- One piece at a time: the user reviews between chunks and commits manually to `main`. No branches, no PRs.
- Before presenting work: `npm run test:run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. All four are clean today, with three pre-existing exceptions: eslint reports 2 warnings (`isDragging` unused in `room-section.tsx`, a stale disable in `pages/api/socketio.ts`) and `tsc` flags the 3 test files that use vitest globals without importing them.
- Commit messages are plain imperative summaries. Releases are annotated git tags — see **Releases**.

## Stack

- **Next.js 16** (App Router) — read `node_modules/next/dist/docs/` before writing Next.js code
- **Drizzle ORM + `pg`**, Postgres 18 in Docker Compose
- **Better Auth** (email/password) + **`@daveyplate/better-auth-ui`** for account UI
- **Socket.io**, mounted through a Pages Router API route
- **Base UI primitives + Tailwind v4** (ShadCN-style wrappers in `src/components/ui`)
- **Vitest + Testing Library** (jsdom)

## Layout

- Routes: `/` welcome · `/dashboard` · `/history` · `/onboarding` · `/join/[inviteCode]` · `/household` · `/account/[[...settings]]` · `/auth/[path]` · `/api/auth/[...all]` · `/api/socketio` (Pages Router)
- `src/lib/actions.ts` — all 20 Server Actions; membership resolves through `getUserMembership()`, and owner-only actions are gated by `requireOwner()`
- `src/lib/timezone.ts` — every bit of date/zone math · `src/lib/chores.ts` — due/overdue · `src/lib/history.ts` — history stats/log (pure, takes `now`/`timeZone`) · `src/lib/socket.ts` — client singleton
- `src/db/schema.ts` — single source of schema truth · `src/db/index.ts` — `db` singleton (globalThis, for dev HMR)
- `src/components/ui/*` — Base UI wrappers · `src/components/timezone-combobox.tsx` — the zone picker

## Invariants

Breaking one of these regresses something silently.

### Dates and timezones

- Instants are converted to **civil dates**: a `Date` at UTC midnight whose Y-M-D is meaningful in the household's zone. Never treat a civil date as an instant.
- `household.timezone` is household-wide, not per-user — overdueness is a shared concept.
- Due/overdue are calendar days, so `getDueDate`/`getDaysUntilDue`/`getOverdueDays` all take `timeZone`; they flip at the household's local midnight.
- Components receive `timeZone` and `now` as props from the server render. **No `new Date()` / `Date.now()` anywhere in a render path** — that is what keeps SSR and hydration byte-identical.
- Timezone options come from `getTimeZoneOptions()` on the server (hydration-stable, and offsets are resolved with full ICU); the browser's `Intl.supportedValuesOf` is deliberately not used. Node 24 slim ships full ICU.
- `/history` stats are all-time and live in `src/lib/history.ts` (pure: `now` and `timeZone` are arguments); only the log is capped, at the most recent 100 completions. Weeks are Monday-start — there is no week-start preference yet.

### Household authority

- Actions resolve the caller's household through `getUserMembership()` / `getUserHouseholdId()` and scope every query to it; nothing crosses household boundaries.
- A user belongs to exactly one household: `household_member.user_id` has a UNIQUE index, and pages resolve membership with `findFirst({ where: userId })`.
- `role` is authoritative. `requireOwner()` gates `deleteHousehold`, `removeMember`, `transferOwnership` and `regenerateInviteCode`. `leaveHousehold` refuses for the last member; an owner leaving a non-empty household auto-transfers ownership to the longest-standing remaining member. `deleteHousehold` requires the typed household name and cascades rooms → chores → completions. The `/join/[inviteCode]` "switch" path deletes a solo household or leaves a shared one, then joins the target.
- Removing a member only deletes their `household_member` row (`chores.assignedUserId` is never set, so no chore reassignment is needed).

### Rendering and client boundaries

- Reuse the inline-edit pattern for rename/edit UIs: pencil → input → check/cross, Enter to save, Escape to cancel.
- A function prop on a `"use client"` entry component raises Next's TS warning 71007; the repo tolerates it (e.g. `ChoreRow`'s `onMarkDone`).
- Never call `setState` inside `useEffect` — `react-hooks/set-state-in-effect` is an eslint error here. Derive from props/state, or use `useSyncExternalStore` for client-only values (see the browser-timezone detection in `OnboardingView`).

### Better Auth UI

- The household entry lives in the `UserButton` menu via `additionalLinks` (`nav-bar.tsx`), and the library's own entry is relabelled `SETTINGS: "Account"` so the menu never shows two "Settings". History is a header button beside the account button instead — a `Link` styled with `buttonVariants()`, since this repo's `Button` is Base UI and has no `asChild`.
- `/household` and `/history` are reached from `/dashboard`; `/history` carries the same back link, and `NavBar` only wraps the `/dashboard` subtree.
- `AccountView`'s sidebar builds `navItems` from a hardcoded array in the library — a "Household" tab cannot be added there. That is why `/household` is its own page.
- Provider config lives in `src/app/providers.tsx`; `@import "@daveyplate/better-auth-ui/css"` must stay in `globals.css`.
- Signup does **not** auto-create a household — `/onboarding` does, and it also picks the timezone.

### Socket.io

- Path `/api/socketio`, `addTrailingSlash: false`. The server instance is stored on `globalThis.socketio` by the API route, so actions call `globalThis.socketio?.to(...)`.
- Events go to `household:{householdId}` rooms: `chore:done` / `chore:undone` for completions, `household:updated` for every other mutation. `DashboardView` and `HistoryView` join the room on mount and call `router.refresh()` on any event.

### Database and migrations

- Schema changes: edit `src/db/schema.ts` → `npx drizzle-kit generate` → `npx drizzle-kit migrate`. **Never `drizzle-kit push`.**
- Migrations `0000`–`0004` are applied; production runs them automatically in the `migrate` service before the app starts.
- `.env` holds `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` — there is **no `DATABASE_URL`**. Compose sets `POSTGRES_HOST=db`; local dev defaults to `localhost`. Never shell-interpolate a `DATABASE_URL` — special characters in passwords break it.
- Postgres 18+ mounts its volume at `/var/lib/postgresql`, not `/var/lib/postgresql/data`.

## Dev workflow

- **Dev (docker):** `docker compose -f docker-compose.dev.yml watch` — compose watch syncs `src/` and `public/`. ⚠️ A _new top-level directory_ under `src/` or `public/` needs a one-time `docker compose -f docker-compose.dev.yml build app` before watch sees it. Edits to existing files occasionally sync without invalidating the dev server's module cache — `docker restart chore-app-1` if the browser or `curl` still shows the old markup.
- **Dev (local):** `npm run dev` — needs Postgres reachable on `localhost:5432`.
- **First time:** `cp .env.example .env` (set `BETTER_AUTH_SECRET`), `docker volume create chore_postgres_data`, start the dev stack, then `npx drizzle-kit migrate`.
- **Migrations locally:** `npx drizzle-kit migrate`.
- **Prod:** `git fetch --tags && git checkout <tag> && docker compose up --build -d`. Secrets live in `secrets/` (gitignored): `postgres_password.txt`, `better_auth_secret.txt`, `cloudflare_tunnel_token.txt`. The `chore_postgres_data` volume must exist before the first deploy.
- Quick container file poke without rebuilding: `docker cp <file> <container>:/app/<path>`.

## Releases

- Version, changelog and tag move together: bump `package.json` (`npm version minor --no-git-tag-version`), move the `## [Unreleased]` entries in `CHANGELOG.md` under `## [X.Y.Z] - <date>`, refresh the compare links, commit, then `git tag -a vX.Y.Z -m "…"` and `git push --follow-tags`.
- Annotated tags only. A tag message describes the tagged tree — never reference work that isn't in it.
- Below `1.0.0`, a minor bump may carry behaviour changes; call them out under **Changed** in the changelog.
- Tagged so far: `v0.1.0` (pre-timezone baseline, 2026-05-31), `v0.2.0` (household timezone + settings, 2026-10-02), `v0.3.0` (history screen, 2026-10-02).

## Testing

- `npm run test:run` — 65 tests in 11 files (`src/test/`, plus `src/test/db/schema.test.ts`). Covers due/overdue/timezone math, history stats/log math, timezone-combobox behaviour (filter, click, Enter, arrow-key selection), the user-menu entries, household member management UI, the join-page switch, and table shapes.
- Server Actions are not unit-tested — they need a live server and a session. To exercise one end-to-end, call it from a temporary route handler with a real session cookie; Next's server-action id is **not** discoverable in dev builds, so a raw `Next-Action` POST usually 404s.
- For `better-auth-ui` components, inject a session through `AuthUIProvider`'s `hooks.useSession` seam (see `src/test/nav-bar.test.tsx`). Stubbing global `fetch` does **not** intercept its session request.
- If the managed Chromium can't launch (missing `libglib-2.0.so.0` on this box), verify client-only surfaces with jsdom tests plus SSR HTML greps instead.

## Test data (dev)

- Connect: `docker compose -f docker-compose.dev.yml exec db psql -U chore -d chore`
- Find your household id: `SELECT id, name, timezone FROM household;`
- Seed (requires an existing household — create one through `/onboarding`). `sort_order` defaults to `0`; set the household timezone on `/household` or overdue badges will use UTC:

```sql
INSERT INTO room (id, name, household_id, created_at, updated_at) VALUES
  ('room-1', 'Kitchen',  '<household-id>', now(), now()),
  ('room-2', 'Bathroom', '<household-id>', now(), now());

INSERT INTO chore (id, name, room_id, interval_days, active, created_at, updated_at) VALUES
  ('chore-1', 'Wash dishes',  'room-1', 1, true, now() - interval '3 days', now()),
  ('chore-2', 'Clean toilet', 'room-2', 7, true, now() - interval '2 days', now());
```

- Reset: `DELETE FROM completion; DELETE FROM chore; DELETE FROM room;` — or `DELETE FROM household;` to drop everything cascading from it.

## Backlog

Unprioritised ideas established after the timezone/household work.

- **Reminders / digest** at a household-local time (e.g. 8am local) — the timezone was the missing prerequisite.
- **Due-date presentation** — "Due Fri, Oct 3" plus dashboard grouping (Overdue / Today / This week), straight from the civil-date helpers.
- **Richer recurrence** — weekly-on-a-weekday, monthly-on-the-Nth, built on civil-date arithmetic rather than `intervalDays` alone.
- **More household preferences** on `/household` — week start, 12/24h, date format, default chore interval.
- **Per-user display timezone** — rendering-only; every date function already takes `timeZone`.
- **CI** — no `.github/` yet; run test/lint/tsc/build on push and build+push the image on tag.
- **Version visibility** — `ARG APP_VERSION` → `ENV APP_VERSION`, surfaced in the UI or `/api/health`, so "what's deployed" doesn't need a shell.
- Closed by decision: a "Household" tab inside `AccountView` (the library hardcodes its nav), and per-user timezones for the _math_ (overdueness is shared).
