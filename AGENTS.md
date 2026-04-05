<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Project Handoff — Chore Manager

## What this app is
A self-hosted household chore tracker for two users. Chores belong to rooms, have a recurrence interval, and users mark them done. Completions are logged with who did it and when. Due dates are calculated from last completion + interval. Overdue chores are highlighted. Real-time updates via Socket.io so both users see changes without refresh.

## Working style
**Work one piece at a time.** The user commits and reviews between each step — do not batch multiple features together. Stop and wait for the go-ahead after each logical chunk.

**The user commits manually.** Never run `git add` or `git commit` — present the work, then wait. The user commits directly to `main` (no branch/PR workflow for this project). May switch to a branch/PR workflow if GitHub Actions CI is added in the future — the user has GitLab CI experience but not GitHub Actions, and hasn't decided if it's worth the overhead for a personal project.

## Tech stack
- **Next.js 16** (App Router) — always read `node_modules/next/dist/docs/` before writing Next.js code
- **Socket.io** — via `pages/api/socketio.ts` (Pages Router API route), client singleton in `src/lib/socket.ts`
- **Better Auth** — email/password auth, Drizzle adapter, route handler at `src/app/api/auth/[...all]/route.ts`
- **Drizzle ORM + pg** — `src/db/index.ts` exports `db` singleton (globalThis pattern for dev HMR), schema at `src/db/schema.ts`
- **Postgres** — runs in Docker Compose, credentials come from `.env`
- **ShadCN + Tailwind v4**
- **Vitest + Testing Library** — unit tests, setup in `src/test/setup.ts`

## What's been completed
1. **Project scaffolding** — Next.js init, all dependencies installed, ShadCN initialized
2. **Docker setup** — `Dockerfile` (node:24-bullseye-slim, multistage: `deps`, `dev`, `migrator`, `builder`, `runner`), `docker-compose.yml` (prod), `docker-compose.dev.yml` (dev with compose watch, syncs `src/` and `public/`, rebuilds on package.json changes), `.dockerignore`
3. **Socket.io** — `src/pages/api/socketio.ts` initializes Socket.io server on `res.socket.server`, stores instance on `globalThis.socketio`. Client singleton in `src/lib/socket.ts`
4. **DB connection** — `src/db/index.ts` with globalThis singleton pattern. Constructs URL from `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` with `encodeURIComponent` (safe for special chars in passwords). `POSTGRES_HOST` defaults to `localhost`; compose sets it to `db` so the container resolves correctly. Never construct `DATABASE_URL` via shell interpolation in compose — special chars in passwords will break URL parsing.
5. **Better Auth** — `src/lib/auth.ts` with Drizzle adapter + email/password enabled. Auth schema generated via `npx @better-auth/cli generate` into `src/db/schema.ts` (user, session, account, verification tables). No auto-household creation on signup — handled via onboarding instead.
6. **Initial migration** — `drizzle/0000_white_mattie_franklin.sql` generated via `npx drizzle-kit generate`. `drizzle.config.ts` uses `@next/env` to load `.env` and falls back to constructing URL from individual vars. Uses `POSTGRES_HOST` env var (defaults to `localhost`) so same config works locally and inside Docker.
7. **Auth UI** — `@daveyplate/better-auth-ui` installed. Auth client at `src/lib/auth-client.ts`, `AuthUIProvider` in `src/app/providers.tsx` (with `redirectTo="/dashboard"`), Sonner `<Toaster />` in layout, dynamic auth route at `src/app/auth/[path]/page.tsx` (covers `/auth/sign-in`, `/auth/sign-up`, etc.). Requires `@import "@daveyplate/better-auth-ui/css"` in `globals.css` for Tailwind v4 — without it component classes are not generated and styling breaks.
8. **Dashboard** — `/` welcome page, `/dashboard` server component with auth guard (`auth.api.getSession`), chores grouped by collapsible rooms ordered by overdue days. Mark-done via Server Action with `useOptimistic` + Sonner undo toaster (5s window). Pure functions in `src/lib/chores.ts` (`getDueDate`, `getOverdueDays`). Dark mode enabled globally via `dark` class on `<html>`.
9. **Households** — `household` and `household_member` tables. `getUserHouseholdId()` helper in `actions.ts` gates all CRUD. `inviteCode` shown on dashboard via "Copy invite link" button. Invite link at `/join/[inviteCode]` adds member to household.
10. **Chore management** — Inline create/edit/delete for rooms and chores on the dashboard. `RoomSection` (`src/app/dashboard/room-section.tsx`) handles collapsible rooms with edit/delete/add-chore. `ChoreRow` (`src/app/dashboard/chore-row.tsx`) handles inline edit/delete per chore. All actions in `src/lib/actions.ts` with household authorization.
11. **Settings page** — `src/app/settings/[[...account]]/page.tsx` using `<AccountView />` from `@daveyplate/better-auth-ui`. Wires up the UserButton "Settings" link. Auth-guarded with redirect to sign-in.
12. **Onboarding flow** — New users without a household are redirected to `/onboarding` instead of dashboard. `src/app/onboarding/page.tsx` (server, auth-guarded, redirects to dashboard if already in household) renders `OnboardingView` client component with two panels: create a new household or join with invite code. Uses `createHousehold` server action.
13. **Socket.io real-time events** — All server actions emit events to `household:{householdId}` rooms. Completions emit `chore:done`/`chore:undone`; room/chore mutations emit `household:updated`. `DashboardView` joins the household room on mount and calls `router.refresh()` on any event so both clients stay in sync without a page reload.
14. **Production Docker + Cloudflare Tunnel** — `docker-compose.yml` uses Docker Compose secrets (`secrets/postgres_password.txt`, `secrets/better_auth_secret.txt`, `secrets/cloudflare_tunnel_token.txt`). `migrate` service runs `npx drizzle-kit migrate` after db health check, before app starts. `app` service reads secrets via `entrypoint.sh`. `cloudflared` service uses native `TUNNEL_TOKEN_FILE` env var. `postgres_data` is an external named volume (`chore_postgres_data`) that persists across rebuilds.

## Known issues
None currently known.

## What's in progress
Nothing — all core features complete.

## What's next (in order)
1. ~~**App schema**~~ — done
2. ~~**Dashboard**~~ — done
3. ~~**Chore management**~~ — done
4. ~~**Settings page**~~ — done
5. ~~**Socket.io events**~~ — done
6. **History screen** — log of completions with who/when
7. **Unit tests** — Vitest tests for business logic (due date calculation, overdue detection — `getDueDate`/`getOverdueDays` already tested)

## Dev workflow
- **Dev:** `docker compose -f docker-compose.dev.yml watch` — hot reload via compose watch, no rebuild needed for source changes
- **Prod:** `docker compose up --build -d` — migrations run automatically via the `migrate` service before app starts
- **Migrations (local):** `npx drizzle-kit migrate` (runs against localhost:5432, requires postgres container running with port 5432 exposed)
- **Prod secrets:** stored in `secrets/` directory (gitignored): `postgres_password.txt`, `better_auth_secret.txt`, `cloudflare_tunnel_token.txt`
- **Prod volume:** `docker volume create chore_postgres_data` must exist before first deploy
- This is a personal project — commit directly to main, no branch/PR workflow needed

## Test data (dev)

Seed rooms and chores for testing:

```sql
INSERT INTO room (id, name, created_at, updated_at) VALUES
  ('room-1', 'Kitchen', now(), now()),
  ('room-2', 'Bathroom', now(), now()),
  ('room-3', 'Living Room', now(), now());

INSERT INTO chore (id, name, room_id, interval_days, active, created_at, updated_at) VALUES
  ('chore-1', 'Wash dishes', 'room-1', 1, true, now() - interval '3 days', now()),
  ('chore-2', 'Wipe counters', 'room-1', 7, true, now() - interval '10 days', now()),
  ('chore-3', 'Clean toilet', 'room-2', 7, true, now() - interval '2 days', now()),
  ('chore-4', 'Scrub shower', 'room-2', 14, true, now() - interval '20 days', now()),
  ('chore-5', 'Vacuum', 'room-3', 7, true, now(), now()),
  ('chore-6', 'Dust shelves', 'room-3', 14, true, now() - interval '1 day', now());
```

Reset (wipe completions/chores/rooms and re-seed):

```sql
DELETE FROM completion;
DELETE FROM chore;
DELETE FROM room;
```

Connect via: `docker compose -f docker-compose.dev.yml exec db psql -U chore -d chore`

## Key conventions
- `.env` holds `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` — no `DATABASE_URL`
- Compose sets `POSTGRES_HOST=db`; local dev defaults to `localhost`. Never use shell-interpolated `DATABASE_URL` in compose files
- Schema changes: edit `src/db/schema.ts` → `npx drizzle-kit generate` → `npx drizzle-kit migrate`
- Never use `drizzle-kit push` — always generate versioned migration files
- Socket.io path is `/api/socketio` with `addTrailingSlash: false`
