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
- Before presenting work: `npm run test:run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. All four are clean. These commands are also the CI gates — see **CI**.
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
- `src/lib/actions.ts` — all 22 Server Actions; membership resolves through `getUserMembership()`, and owner-only actions are gated by `requireOwner()`
- `src/lib/timezone.ts` — every bit of date/zone math · `src/lib/chores.ts` — recurrence model, due/overdue math, bucketing and due-date labels · `src/lib/history.ts` — history stats/log (pure, takes `now`/`timeZone`) · `src/lib/socket.ts` — client singleton
- `src/lib/digest.ts` — digest schedule decision (`getScheduledDigestDay`/`isDigestDue`) and email copy (`buildDigest`), pure · `src/lib/digest-runner.ts` — the only module that reads the DB for the digest and sends mail · `src/lib/mail-config.ts` (env → `MailConfig`, no `nodemailer`) + `src/lib/mailer.ts` (transport) · `src/lib/digest-scheduler.ts` + `src/instrumentation.ts` — the 15-minute tick, started once per server process
- `src/db/schema.ts` — single source of schema truth · `src/db/index.ts` — `db` singleton (globalThis, for dev HMR)
- `src/components/ui/*` — Base UI wrappers · `src/components/timezone-combobox.tsx` — the zone picker · `src/components/recurrence-fields.tsx` — shared recurrence fields
- `src/app/dashboard/types.ts` — the `Chore`/`Room` view types shared by `dashboard-view`, `room-section`, `chore-row` and `due-soon`

## Invariants

Breaking one of these regresses something silently.

### Dates and timezones

- Instants are converted to **civil dates**: a `Date` at UTC midnight whose Y-M-D is meaningful in the household's zone. Never treat a civil date as an instant.
- `household.timezone` is household-wide, not per-user — overdueness is a shared concept.
- Due/overdue are calendar days, so `getDueDate`/`getDaysUntilDue`/`getOverdueDays` all take `timeZone`; they flip at the household's local midnight.
- Components receive `timeZone` and `now` as props from the server render. **No `new Date()` / `Date.now()` anywhere in a render path** — that is what keeps SSR and hydration byte-identical.
- A chore's cadence is `recurrence` + its parameters, not `intervalDays` alone: `intervalDays` counts days and is read **only** when `recurrence = 'days'`; `recurrenceInterval` means weeks for `weekly` and months for `monthly`; `recurrenceWeekday` is `0 = Sunday … 6 = Saturday`; `recurrenceMonthDay` is `1–31` and clamps to the target month's last day. Anything that renders a cadence or compares against one goes through `describeRecurrence` / `getTargetDays` — never `intervalDays` directly.
- Recurrence phase is anchored to the last completion's local civil day (the create day when never completed), and the due day is always strictly after it, so completing early or late re-phases the schedule.
- Due-date labels (`formatDueDate`, `getDueBucket`) format a **civil date** with a `timeZone: "UTC"` formatter, matching `history.ts`; only the cross-year decision uses the household zone. Formatters are module-level, never per-render.
- The `Due soon` panel on `/dashboard` duplicates rows that also appear under their rooms; both read the same `optimisticDoneIds`, so `Mark Done` in either place updates both.
- Timezone options come from `getTimeZoneOptions()` on the server (hydration-stable, and offsets are resolved with full ICU); the browser's `Intl.supportedValuesOf` is deliberately not used. Node 24 slim ships full ICU.
- `/history` stats are all-time and live in `src/lib/history.ts` (pure: `now` and `timeZone` are arguments); only the log is capped, at the most recent 100 completions. Weeks start on `household.week_starts_on` (default Monday), and the log/day/week labels follow `household.date_format`; log times follow `household.hour_cycle`.
- Household-wide display preferences live on `household`: `week_starts_on` (`0`–`6`), `hour_cycle` (`h12`/`h23`), `date_format` (`mdy`/`dmy`) and `default_interval_days` (prefills the add-chore count; the form still opens on "Days"). `src/lib/preferences.ts` holds the types, option labels and `normalizeHouseholdPreferences`; the member-editable `updateHouseholdPreferences` action validates through it. `date_format` only swaps the `Intl` formatter (US `en-US` vs day-month `en-AU`, chosen for a consistent comma) — due-date math is unchanged. The digest's `digest_enabled`/`digest_day`/`digest_hour` ride on the same `household` row through the same action, but they are the one group that saves **immediately** instead of behind the Preferences `Save` — see **Weekly digest email**.
- The app version is injected as `APP_VERSION` at build/run time and read through `src/lib/version.ts` (falls back to `dev`); it renders in the global footer (`layout.tsx`) and at `/api/health`. `docker-compose.yml` passes `APP_VERSION` (default `dev`) as a build arg.
- `/history`'s cadence rows are described, not computed: `getCadenceVerdict` (tolerance = half a day or 5% of the target, whichever is larger) and `describeCadenceInterval` produce the words, `describeRecurrence` produces the schedule. `getTargetDays` uses exact weeks and the mean Gregorian month, so a punctual monthly chore never reads as late.
- `/history` reads top-down as summary → trend → detail: totals, `By member`, `By room`, `Last 8 weeks`, then `Cadence`, then `Recent completions`. Cadence has one row per chore, so it is a `Collapsible` (open by default, trigger carries the count) and the trend sits directly above it — a full list must never push the trend chart out of view again.

### Weekly digest email

- The slot, not the timer, is the source of truth: `isDigestDue` compares `household.digest_last_sent_on` (a `YYYY-MM-DD` civil date in the household zone) with the most recent scheduled slot, so restarts and repeated ticks cannot double-send. `digestLastSentOn` is written **only** by `digest-runner.ts`.
- A slot is consumed even when nothing is sent — no chores in the window, or every recipient opted out — so a stale digest never lands later. When *every* send failed the column is left untouched, which is what makes the next tick retry.
- `digest_enabled` defaults `false`; `notify_digest` (per member) defaults `true`. The runner ANDs the two: the household switch decides whether the household sends at all, the member flag whether that member receives it — so three of the four combinations send nothing.
- All three household digest fields apply **immediately** through `updateHouseholdPreferences` (which still carries the four display preferences unchanged, so a digest edit cannot clobber unsaved edits in the Preferences section); the per-member opt-out applies immediately through `updateDigestOptIn`. They are deliberately *not* part of `preferencesChanged`/the Preferences `Save` button, and the personal checkbox is `disabled` while the household digest is off — that is what keeps the two switches from reading as duplicates.
- `getScheduledDigestDay` does civil-day arithmetic on UTC-midnight dates only (`getHourInTimeZone` supplies the local hour), so a DST day — 23 or 25 hours — cannot shift the slot by a day. `getHourInTimeZone` builds `hourCycle: "h23"`, not `hour12: false`, which ICU can render as `24`.
- `buildDigest` escapes every interpolated value (`householdName`, room names, chore names, labels) with `escapeHtml` in the HTML part; the text part stays raw. `appUrl` comes from `BETTER_AUTH_URL`, never user input.
- The scheduler assumes **one app replica**: two containers against one database can both send within the same tick, because the `digest_last_sent_on` write is not a compare-and-swap. `DIGEST_SCHEDULER=off` disables the tick; `SMTP_HOST`/`MAIL_FROM` unset disables email entirely and logs one warning at boot.
- `src/instrumentation.ts` must stay a thin `register()` with a runtime-gated dynamic import: a static import would pull `pg`/`nodemailer` into the edge-runtime graph, and `next build` must never start the timer.
- Never import `mailer.ts` (or `digest-scheduler.ts`) from a client component or from a test — it would keep the Vitest process alive. `mail-config.ts` exists precisely so a server component can ask "is mail configured?" without loading `nodemailer`.

### Household authority

- Actions resolve the caller's household through `getUserMembership()` / `getUserHouseholdId()` and scope every query to it; nothing crosses household boundaries.
- A user belongs to exactly one household: `household_member.user_id` has a UNIQUE index, and pages resolve membership with `findFirst({ where: userId })`.
- `role` is authoritative. `requireOwner()` gates `deleteHousehold`, `removeMember`, `transferOwnership` and `regenerateInviteCode`. `leaveHousehold` refuses for the last member; an owner leaving a non-empty household auto-transfers ownership to the longest-standing remaining member. `deleteHousehold` requires the typed household name and cascades rooms → chores → completions. The `/join/[inviteCode]` "switch" path deletes a solo household or leaves a shared one, then joins the target.
- Removing a member only deletes their `household_member` row (`chores.assignedUserId` is never set, so no chore reassignment is needed).

### Rendering and client boundaries

- The chore row (`chore-row.tsx`) is three tiers plus actions, and the shape is deliberate: the title line holds the chore name, then the room chip (an `outline` `Badge` with `bg-muted/50`, only when `roomName` is passed, i.e. the `Due soon` panel); the meta line holds the cadence and, after a `·`, `Last done by …`; the bottom line is the due/overdue badge alone (absent while the chore is optimistically done); the action buttons sit to the right of the block on `sm+` and drop to a full-width row below the text on mobile. Don't inline room/cadence/badge into one wrapping line — that ragged-indented the cadence and last-done when badges changed width, and a plain muted room name between the title and the badge read as neither. Keep the chip on the badge default `text-foreground`: `text-muted-foreground` at 12px on the dark background is only ~7.6:1 and reads as washed-out gray.
- Reuse the inline-edit pattern for rename/edit UIs: pencil → input → check/cross, Enter to save, Escape to cancel.
- The page container keeps its `py-6` bottom padding — the dashboard layout adds the home-indicator inset *on top* of it (`pb-[calc(1.5rem+env(safe-area-inset-bottom))]`). A bare `pb-[env(…)]` overwrites the padding and the last element (the "Add room" button) touches the app footer.
- `/dashboard` opens with the household name (`h1`) and the invite button, and only then the `Due soon` panel; the section order of both screens is deliberate — name first, then what needs doing.
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
- Migrations `0000`–`0008` are applied; production runs them automatically in the `migrate` service before the app starts.
- `.env` holds `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` — there is **no `DATABASE_URL`**. Compose sets `POSTGRES_HOST=db`; local dev defaults to `localhost`. Never shell-interpolate a `DATABASE_URL` — special characters in passwords break it.
- The digest's optional vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `MAIL_FROM`, `DIGEST_SCHEDULER`) are documented in `.env.example` and passed through by `docker-compose.yml`; `docker-compose.dev.yml` uses `env_file: .env`, so a dev `.env` is enough. The SMTP password is a plain env var like `POSTGRES_PASSWORD`, deliberately not a Docker secret (only `postgres_password`, `better_auth_secret` and `cloudflare_tunnel_token` are read from `/run/secrets`): it keeps dev and prod on one mechanism, and on a single-tenant host the Docker socket is already root-equivalent, so a mounted secret buys no boundary. The residual exposure is real and deliberate — `docker inspect`, `docker compose config` and `/proc/1/environ` inside the `app` container all show it. The upgrade path, if that ever matters: add `secrets/smtp_password.txt`, pass `SMTP_PASSWORD_FILE=/run/secrets/smtp_password` to the `app` service, and read it in `mail-config.ts` the way the `db` service uses `POSTGRES_PASSWORD_FILE` (falling back to `SMTP_PASSWORD` so `.env` keeps working).
- Postgres 18+ mounts its volume at `/var/lib/postgresql`, not `/var/lib/postgresql/data`.

## Dev workflow

- **Dev (docker):** `docker compose -f docker-compose.dev.yml watch` — compose watch syncs `src/` and `public/`. ⚠️ A _new top-level directory_ under `src/` or `public/` needs a one-time `docker compose -f docker-compose.dev.yml build app` before watch sees it. Edits to existing files occasionally sync without invalidating the dev server's module cache — `docker restart chore-app-1` if the browser or `curl` still shows the old markup.
- **Dev (local):** `npm run dev` — needs Postgres reachable on `localhost:5432`. The dev server also runs `src/instrumentation.ts`, so the digest scheduler starts with it: boot logs `[digest] SMTP not configured …` unless `SMTP_HOST` and `MAIL_FROM` are set, and its first tick is 20 s in. `DIGEST_SCHEDULER=off` keeps it out of the way while you exercise `runDueDigests()` by hand.
- **First time:** `cp .env.example .env` (set `BETTER_AUTH_SECRET`), `docker volume create chore_postgres_data`, start the dev stack, then `npx drizzle-kit migrate`.
- **Migrations locally:** `npx drizzle-kit migrate`.
- **Prod:** `git fetch --tags && git checkout <tag> && docker compose up --build -d`. Secrets live in `secrets/` (gitignored): `postgres_password.txt`, `better_auth_secret.txt`, `cloudflare_tunnel_token.txt`. The `chore_postgres_data` volume must exist before the first deploy.
- Quick container file poke without rebuilding: `docker cp <file> <container>:/app/<path>`.

## Releases

- Version, changelog and tag move together: bump `package.json` (`npm version minor|patch --no-git-tag-version`), add a `## [X.Y.Z] - <date>` section to `CHANGELOG.md` (the file carries no `[Unreleased]` section between releases), refresh the compare links at the bottom, commit, then `git tag -a vX.Y.Z -m "…"` and `git push --follow-tags`.
- Annotated tags only. A tag message describes the tagged tree — never reference work that isn't in it.
- Below `1.0.0`, a minor bump may carry behaviour changes; call them out under **Changed** in the changelog.
- Tagged so far: `v0.1.0` (pre-timezone baseline, 2026-05-31), `v0.2.0` (household timezone + settings, 2026-10-02), `v0.3.0` (history screen, 2026-10-02), `v0.4.0` (membership enforcement, member management, join-page switch, 2026-10-02), `v0.5.0` (weekly/monthly recurrence, human-readable due dates, `Due soon` panel, 2026-10-03), `v0.6.0` (household preferences, version visibility, 2026-10-03), `v0.7.0` (CI, 2026-10-03), `v0.7.1` (lint cleanup, CI runner pin, 2026-10-03), `v0.7.2` (history section order, dashboard heading, 2026-10-03), `v0.7.3` (chore row tiers, dashboard bottom padding, 2026-10-03).

## CI

- `.github/workflows/ci.yml` runs on every push to `main`, every `v*` tag and `workflow_dispatch`, on `ubuntu-24.04` with Node 24 (same major as the `Dockerfile`): `npm ci`, `test:run`, `lint`, `tsc --noEmit`, `build`. The gates must stay at exit 0. No service container — the suite is pure and `next build` needs no database or `.env`. The runner label is pinned rather than `ubuntu-latest` so the October 2026 Ubuntu 26 migration is opt-in.
- A `v*` tag additionally builds the `runner` Docker target and pushes `ghcr.io/talonlikeaclaw/chore:<tag>` plus `:latest` with `GITHUB_TOKEN` (`packages: write`), using the Actions build cache. The image is public (public repo).
- The pushed image bakes `NEXT_PUBLIC_BETTER_AUTH_URL` at build time from the repository variable of the same name; unset falls back to the code's `http://localhost:3000`. `APP_VERSION` is the tag name. Production still builds from source (`docker compose up --build -d`); pulling the image instead is **not** wired up.

## Testing

- `npm run test:run` — 132 tests in 14 files (`src/test/`, plus `src/test/db/schema.test.ts`). Covers due/overdue/timezone math, recurrence math (weekly/monthly/clamping, normalization, labels, bucketing, due-date formatting), household preference validation, the digest schedule decision and email copy (slot arithmetic incl. a DST fall-back day, idempotency, subject/label/escaping), history stats/log math and the `/history` section order (trend above a collapsed cadence), timezone-combobox behaviour (filter, click, Enter, arrow-key selection), the user-menu entries, household member management UI incl. the digest controls, the join-page switch, and table shapes.
- Server Actions are not unit-tested — they need a live server and a session. To exercise one end-to-end, call it from a temporary route handler with a real session cookie; Next's server-action id is **not** discoverable in dev builds, so a raw `Next-Action` POST usually 404s.
- For `better-auth-ui` components, inject a session through `AuthUIProvider`'s `hooks.useSession` seam (see `src/test/nav-bar.test.tsx`). Stubbing global `fetch` does **not** intercept its session request.
- If the managed Chromium can't launch (missing `libglib-2.0.so.0` on this box), verify client-only surfaces with jsdom tests plus SSR HTML greps instead. Signed-in pages can be grepped with `curl` by minting a cookie from an existing session row: `better-auth.session_token=encodeURIComponent("<session.token>." + base64(HMAC-SHA256(<BETTER_AUTH_SECRET>, <session.token>)))`.

## Test data (dev)

- Connect: `docker compose -f docker-compose.dev.yml exec db psql -U chore -d chore`
- Find your household id: `SELECT id, name, timezone FROM household;`
- Seed (requires an existing household — create one through `/onboarding`). `sort_order` defaults to `0`; set the household timezone on `/household` or overdue badges will use UTC:

```sql
INSERT INTO room (id, name, household_id, created_at, updated_at) VALUES
  ('room-1', 'Kitchen',  '<household-id>', now(), now()),
  ('room-2', 'Bathroom', '<household-id>', now(), now());

INSERT INTO chore (id, name, room_id, interval_days, recurrence, recurrence_interval, recurrence_weekday, recurrence_month_day, active, created_at, updated_at) VALUES
  ('chore-1', 'Wash dishes',   'room-1', 1, 'days',    1, 0, 1, true, now() - interval '3 days', now()),
  ('chore-2', 'Clean toilet',  'room-2', 7, 'days',    1, 0, 1, true, now() - interval '2 days', now()),
  ('chore-3', 'Water plants',  'room-1', 1, 'weekly',  2, 6, 1, true, now(),                    now()),
  ('chore-4', 'Change filter', 'room-2', 1, 'monthly', 1, 0, 1, true, now(),                    now());
```

- Reset: `DELETE FROM completion; DELETE FROM chore; DELETE FROM room;` — or `DELETE FROM household;` to drop everything cascading from it.

## Backlog

Unprioritised ideas established after the timezone/household work.

- **Per-user display timezone** — rendering-only; every date function already takes `timeZone`.
- Closed by decision: a "Household" tab inside `AccountView` (the library hardcodes its nav), and per-user timezones for the _math_ (overdueness is shared).
- Shipped: **reminders / digest** at a household-local weekday and hour (v0.8.0) — see **Weekly digest email**.
