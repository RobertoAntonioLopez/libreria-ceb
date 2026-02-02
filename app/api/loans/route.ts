import { NextResponse } from "next/server";
import db from "../../../lib/db";

function asText(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const status = (searchParams.get("status") ?? "active").toLowerCase();
  const q = (searchParams.get("q") ?? "").trim();

  let where = "1=1";
  if (status === "active") where = "l.returned_at IS NULL";
  if (status === "overdue") where = "l.returned_at IS NULL AND l.due_date < now()";
  if (status === "returned") where = "l.returned_at IS NOT NULL";

  const search = q ? `%${q}%` : null;

  try {
    const result = await db.query(
      `
      SELECT
        l.id,
        l.borrower,
        l.borrow_date,
        l.due_date,
        l.returned_at,
        b.id AS book_id,
        b.title,
        b.author,
        b.category
      FROM loans l
      JOIN books b ON b.id = l.book_id
      WHERE ${where}
        AND (
          $1::text IS NULL
          OR b.title ILIKE $1
          OR COALESCE(b.author,'') ILIKE $1
          OR COALESCE(b.category,'') ILIKE $1
          OR l.borrower ILIKE $1
        )
      ORDER BY
        CASE WHEN l.returned_at IS NULL THEN 0 ELSE 1 END,
        l.due_date ASC,
        l.borrow_date DESC
      LIMIT 500;
      `,
      [search]
    );

    return NextResponse.json({ ok: true, data: result.rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error loading loans" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const bookId = asText(body.book_id);
    const borrower = asText(body.borrower);
    const dueRaw = asText(body.due_date); // "YYYY-MM-DD" recomendado

    if (!bookId) {
      return NextResponse.json({ ok: false, error: "book_id es obligatorio." }, { status: 400 });
    }
    if (!borrower) {
      return NextResponse.json({ ok: false, error: "El prestatario es obligatorio." }, { status: 400 });
    }
    if (!dueRaw) {
      return NextResponse.json({ ok: false, error: "due_date es obligatorio (YYYY-MM-DD)." }, { status: 400 });
    }

    const dueDate = new Date(dueRaw);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ ok: false, error: "due_date inválida. Usa YYYY-MM-DD." }, { status: 400 });
    }

    // Evitar fechas pasadas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueOnly = new Date(dueDate);
    dueOnly.setHours(0, 0, 0, 0);
    if (dueOnly < today) {
      return NextResponse.json({ ok: false, error: "due_date no puede ser una fecha pasada." }, { status: 400 });
    }

    await db.query("BEGIN");

    // Bloquear libro
    const bookRes = await db.query(
      `SELECT id, copies_available FROM books WHERE id = $1 FOR UPDATE`,
      [bookId]
    );

    if (bookRes.rowCount === 0) {
      await db.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Libro no encontrado." }, { status: 404 });
    }

    const copiesAvailable = Number(bookRes.rows[0].copies_available);
    if (copiesAvailable <= 0) {
      await db.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "No hay copias disponibles para prestar este libro." },
        { status: 400 }
      );
    }

    const loanRes = await db.query(
      `
      INSERT INTO loans (book_id, borrower, due_date)
      VALUES ($1, $2, $3)
      RETURNING id, book_id, borrower, borrow_date, due_date, returned_at;
      `,
      [bookId, borrower, dueDate.toISOString()]
    );

    await db.query(`UPDATE books SET copies_available = copies_available - 1 WHERE id = $1`, [bookId]);

    await db.query("COMMIT");

    return NextResponse.json({ ok: true, message: "Préstamo creado.", data: loanRes.rows[0] }, { status: 201 });
  } catch (err: any) {
    try {
      await db.query("ROLLBACK");
    } catch {}
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error creating loan" },
      { status: 500 }
    );
  }
}
