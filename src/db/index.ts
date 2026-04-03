import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

const host = process.env.POSTGRES_HOST ?? "localhost";
const url =
  process.env.DATABASE_URL ??
  `postgresql://${encodeURIComponent(process.env.POSTGRES_USER!)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD!)}@${host}:5432/${process.env.POSTGRES_DB}`;

export const db = globalForDb.db ?? drizzle(url, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
