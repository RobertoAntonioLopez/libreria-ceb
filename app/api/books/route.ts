import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    let rows: any[];

    if (q) {
      const like = `%${q}%`;
      rows = await sql`
        SELECT id, title, author, category, pages, copies_total, copies_available
        FROM books
        WHERE title ILIKE ${like}
           OR author ILIKE ${like}
           OR category ILIKE ${like}
        ORDER BY title ASC
      `;
    } else {
      rows = await sql`
        SELECT id, title, author, category, pages, copies_total, copies_available
        FROM books
        ORDER BY title ASC
      `;
    }

    return NextResponse.json({ ok: true, data: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
