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
2. **Docker setup** — `Dockerfile` (node:24-bullseye-slim, multistage with `dev` and `runner` stages), `docker-compose.yml` (prod, `env_file: .env`, `POSTGRES_HOST=db`), `docker-compose.dev.yml` (dev with compose watch, syncs `src/` and `public/`, rebuilds on package.json changes), `.dockerignore`
3. **Socket.io** — `src/pages/api/socketio.ts` initializes Socket.io server on `res.socket.server`, ping/pong wired up. Client singleton in `src/lib/socket.ts`
4. **DB connection** — `src/db/index.ts` with globalThis singleton pattern. Constructs URL from `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` with `encodeURIComponent` (safe for special chars in passwords). `POSTGRES_HOST` defaults to `localhost`; compose sets it to `db` so the container resolves correctly. Never construct `DATABASE_URL` via shell interpolation in compose — special chars in passwords will break URL parsing.
5. **Better Auth** — `src/lib/auth.ts` with Drizzle adapter + email/password enabled. Auth schema generated via `npx @better-auth/cli generate` into `src/db/schema.ts` (user, session, account, verification tables)
6. **Initial migration** — `drizzle/0000_white_mattie_franklin.sql` generated via `npx drizzle-kit generate`. `drizzle.config.ts` uses `@next/env` to load `.env` and falls back to constructing URL from individual vars
7. **Auth UI** — `@daveyplate/better-auth-ui` installed. Auth client at `src/lib/auth-client.ts`, `AuthUIProvider` in `src/app/providers.tsx`, Sonner `<Toaster />` in layout, dynamic auth route at `src/app/auth/[path]/page.tsx` (covers `/auth/sign-in`, `/auth/sign-up`, etc.). Requires `@import "@daveyplate/better-auth-ui/css"` in `globals.css` for Tailwind v4 — without it component classes are not generated and styling breaks.

## What's in progress
Auth UI smoke tested and working. Sign-up and sign-in confirmed functional.

## What's next (in order)
1. **App schema** — add `rooms`, `chores`, `completions` tables to `src/db/schema.ts`, generate + apply migration
2. **Dashboard** — chores grouped by room, overdue highlighted, mark-done button
3. **Socket.io events** — broadcast completion events so both clients update live
4. **Chore management** — create/edit/delete chores and rooms
5. **History screen** — log of completions with who/when
6. **Unit tests** — Vitest tests for business logic (due date calculation, overdue detection)

## Dev workflow
- **Dev:** `docker compose -f docker-compose.dev.yml watch` — hot reload via compose watch, no rebuild needed for source changes
- **Prod:** `docker compose up --build -d`
- **Migrations:** `npx drizzle-kit migrate` (runs against localhost:5432, requires postgres container running with port 5432 exposed)
- This is a personal project — commit directly to main, no branch/PR workflow needed

## Key conventions
- `.env` holds `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` — no `DATABASE_URL`
- Compose sets `POSTGRES_HOST=db`; local dev defaults to `localhost`. Never use shell-interpolated `DATABASE_URL` in compose files
- Schema changes: edit `src/db/schema.ts` → `npx drizzle-kit generate` → `npx drizzle-kit migrate`
- Never use `drizzle-kit push` — always generate versioned migration files
- Socket.io path is `/api/socketio` with `addTrailingSlash: false`
