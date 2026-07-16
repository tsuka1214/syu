import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const poolConfig: pg.PoolConfig = {
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
};

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

export * from "./schema";
