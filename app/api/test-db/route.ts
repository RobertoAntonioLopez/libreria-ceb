import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  try {
    const result = await pool.query("SELECT NOW() as now");
    return NextResponse.json({ ok: true, now: result.rows[0].now });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "DB error" },
      { status: 500 }
    );
  }
}
