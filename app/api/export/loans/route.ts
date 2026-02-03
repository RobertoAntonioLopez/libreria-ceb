import { NextResponse } from "next/server";
import db from "../../../../lib/db";

export async function GET(req: Request) {

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (token && token === process.env.BACKUP_TOKEN) {
    // permitido
  } else {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await db.query(`
    SELECT *
    FROM loans
    ORDER BY created_at DESC
  `);

  return NextResponse.json({
    ok: true,
    data: result.rows
  });
}

