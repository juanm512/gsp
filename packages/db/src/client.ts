import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

const { Pool } = pg;

// Determine if SSL should be used based on environment
const isProduction = process.env.NODE_ENV === "production";
const connectionString = process.env.POSTGRES_URL;

// Use connection pool for better performance
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("supabase") || connectionString?.includes("sslmode")
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
});
