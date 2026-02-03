import { neon } from "@neondatabase/serverless";

/**
 * Neon serverless driver (compatible con Cloudflare Workers).
 * DATABASE_URL debe venir de .dev.vars (preview) o env vars en Cloudflare (prod).
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

export const sql = neon(databaseUrl);

/**
 * Wrapper compatible con código existente tipo `db.query(text, params)`
 * para no reescribir todos los endpoints ahora.
 *
 * Devuelve { rows, rowCount } similar a pg.
 */
const db = {
  async query(text: string, params: any[] = []) {
    const rows = await sql.query(text, params);
    return { rows, rowCount: rows.length };
  },
};

export default db;
