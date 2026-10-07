# chore

A self-hosted household chore tracker. Chores belong to rooms, have a recurrence interval, and household members mark them done. Overdue chores are highlighted. Real-time updates via Socket.io, plus an optional weekly digest email.

## AI assistance

This project is developed with AI coding agents. Originally
[Claude Code](https://claude.ai/code), and since then omp agents. Code, tests,
migrations, and docs are largely agent-written; a human directs the work and
reviews, commits, tags, and deploys every change. The working conventions used
by those agents are documented in [AGENTS.md](./AGENTS.md).

## Stack

Next.js 16 (App Router) · Drizzle ORM + Postgres · Better Auth · Socket.io · ShadCN + Tailwind v4 · nodemailer (optional SMTP)

## Dev

```bash
docker compose -f docker-compose.dev.yml watch
```

Hot reload via compose watch — source changes sync without rebuild.

**Seed data** (needs a household from `/onboarding`; connect via `docker compose -f docker-compose.dev.yml exec db psql -U chore -d chore`):

```sql
INSERT INTO room (id, name, household_id, created_at, updated_at) VALUES
  ('room-1', 'Kitchen',  '<household-id>', now(), now()),
  ('room-2', 'Bathroom', '<household-id>', now(), now());

INSERT INTO chore (id, name, room_id, interval_days, active, created_at, updated_at) VALUES
  ('chore-1', 'Wash dishes', 'room-1', 1, true, now() - interval '3 days', now()),
  ('chore-2', 'Clean toilet', 'room-2', 7, true, now() - interval '2 days', now());
```

## Weekly digest email

Optional and off by default. A household can mail the chores due in the next 7
days — overdue included, grouped by room — at a household-local weekday and hour,
and each member opts in or out for their own inbox. Set it up at `/household` →
**Email notifications**.

```bash
SMTP_HOST=smtp.resend.com        # required
MAIL_FROM=chore@your-domain.com  # required
SMTP_PORT=465                    # default 587; 465 implies TLS
SMTP_USER=resend                 # optional; omit for a relay without auth
SMTP_PASSWORD=<api key>
SMTP_SECURE=true                 # optional; must be exactly "true"
# DIGEST_SCHEDULER=off           # uncomment to disable the scheduler
```

Any SMTP provider works: Resend, Mailgun, Postmark, a local Postfix, or Gmail
(`smtp.gmail.com:465` with a 16-character app password, `SMTP_USER` = `MAIL_FROM`).
`SMTP_PASSWORD` is a plain env var, so it shows up in `docker inspect` and
`/proc/1/environ`; AGENTS.md records the decision and the `SMTP_PASSWORD_FILE`
upgrade path. Restart the container after changing any of these.

The scheduler ticks every 15 minutes, first pass about 20 s after boot, and
assumes one app replica. A per-household civil date stops double sends, an empty
window or a full opt-out sends nothing, and each recipient gets their own message.
Watch for `[digest] checked N households, sent M emails to K recipients`.

**Send test email** in the same section mails the digest to your own address
right away, whatever the schedule and switches say, with a `[Test]` subject. It
writes nothing, so it never consumes or delays the weekly slot.

## Production (first deploy)

1. Create the persistent volume:

   ```bash
   docker volume create chore_postgres_data
   ```

2. Create `secrets/` with three files:

   ```
   secrets/postgres_password.txt
   secrets/better_auth_secret.txt
   secrets/cloudflare_tunnel_token.txt
   ```

3. Create `.env`:

   ```
   POSTGRES_USER=chore
   POSTGRES_DB=chore
   BETTER_AUTH_URL=https://your-domain.com
   NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain.com

   # optional, for the weekly digest
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASSWORD=<api key>
   MAIL_FROM=chore@your-domain.com
   ```

   `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET` come from `secrets/`
   (`entrypoint.sh` reads them from `/run/secrets`); the `SMTP_*` vars are read
   from `.env`. `.env.example` lists all of them.

4. Deploy:
   ```bash
   docker compose up --build -d
   ```

Migrations run automatically before the app starts. Cloudflare Tunnel handles public access.

## Subsequent deploys

Deploy a tagged release:

```bash
git fetch --tags
git checkout <tag>          # e.g. v0.6.0
APP_VERSION=$(git describe --tags) docker compose up --build -d
```

`APP_VERSION` is baked into the image and shown in the footer and at `/api/health`.

## Schema changes

```bash
# Edit src/db/schema.ts, then:
npx drizzle-kit generate
npx drizzle-kit migrate   # requires postgres running on localhost:5432
```

Never use `drizzle-kit push` — always generate versioned migration files.
