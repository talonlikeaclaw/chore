# chore

A self-hosted household chore tracker. Chores belong to rooms, have a recurrence interval, and household members mark them done. Overdue chores are highlighted. Real-time updates via Socket.io.

## Stack

Next.js 16 (App Router) · Drizzle ORM + Postgres · Better Auth · Socket.io · ShadCN + Tailwind v4

## Dev

```bash
docker compose -f docker-compose.dev.yml watch
```

Hot reload via compose watch — source changes sync without rebuild.

**Seed data** (connect via `docker compose -f docker-compose.dev.yml exec db psql -U chore -d chore`):

```sql
INSERT INTO room (id, name, created_at, updated_at) VALUES
  ('room-1', 'Kitchen', now(), now()),
  ('room-2', 'Bathroom', now(), now());

INSERT INTO chore (id, name, room_id, interval_days, active, created_at, updated_at) VALUES
  ('chore-1', 'Wash dishes', 'room-1', 1, true, now() - interval '3 days', now()),
  ('chore-2', 'Clean toilet', 'room-2', 7, true, now() - interval '2 days', now());
```

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
   ```

4. Deploy:
   ```bash
   docker compose up --build -d
   ```

Migrations run automatically before the app starts. Cloudflare Tunnel handles public access.

## Subsequent deploys

```bash
git pull && docker compose up --build -d
```

## Schema changes

```bash
# Edit src/db/schema.ts, then:
npx drizzle-kit generate
npx drizzle-kit migrate   # requires postgres running on localhost:5432
```

Never use `drizzle-kit push` — always generate versioned migration files.

---

Built with help from [Claude Code](https://claude.ai/code).
