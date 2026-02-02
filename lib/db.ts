import { Pool } from "pg";

declare global {
  // Evita crear múltiples pools en hot-reload (dev)
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

export default pool;
