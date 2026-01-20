import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

const { Pool } = pg;

// Use connection pool for better performance
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase pooler
  },
});

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
});
