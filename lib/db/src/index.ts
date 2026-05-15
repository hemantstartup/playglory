import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Do NOT throw at module load — that causes FUNCTION_INVOCATION_FAILED on every
// cold start if DATABASE_URL hasn't been set in the deployment env yet.
// The pool will fail gracefully on first query, giving a proper 500 instead.
if (!process.env.DATABASE_URL) {
  console.error(
    "[db] DATABASE_URL is not set — all database queries will fail. " +
    "Set it in Vercel → Settings → Environment Variables.",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
