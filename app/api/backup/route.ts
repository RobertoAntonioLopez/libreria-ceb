import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");

    if (auth !== `Bearer ${process.env.BACKUP_TOKEN}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const books = await sql`SELECT * FROM books ORDER BY title`;
const loans = await sql`SELECT * FROM loans ORDER BY created_at`;

const backup = {
  generated_at: new Date().toISOString(),
  books,
  loans,
};


    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${Date.now()}.json"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
