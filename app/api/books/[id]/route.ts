import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { normalizeTitle } from "../../../../lib/normalize";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const body = await req.json();

    const titleRaw = body.title != null ? String(body.title).trim() : null;
    const author = body.author != null ? String(body.author).trim() || null : null;
    const category = body.category != null ? String(body.category).trim() || null : null;
    const pages =
      body.pages === "" || body.pages == null ? null : Number(body.pages);

    // copies_total: si lo cambias, ajustamos available sin romper reglas
    const copiesTotal =
      body.copies_total == null ? null : Number(body.copies_total);

    if (pages !== null && Number.isNaN(pages as any)) {
      return NextResponse.json({ ok: false, error: "Pages debe ser un número." }, { status: 400 });
    }
    if (copiesTotal !== null && (!Number.isInteger(copiesTotal) || copiesTotal < 1)) {
      return NextResponse.json(
        { ok: false, error: "copies_total debe ser un entero >= 1." },
        { status: 400 }
      );
    }

    // Leer estado actual (para mantener copies_available coherente)
    const current = await db.query(
      `SELECT copies_total, copies_available FROM books WHERE id = $1`,
      [id]
    );
    if (current.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Libro no encontrado." }, { status: 404 });
    }

    const curTotal = Number(current.rows[0].copies_total);
    const curAvail = Number(current.rows[0].copies_available);

    let newTotal = curTotal;
    let newAvail = curAvail;

    if (copiesTotal !== null) {
      const activeLoans = curTotal - curAvail; // copias prestadas
      if (copiesTotal < activeLoans) {
        return NextResponse.json(
          { ok: false, error: `No puedes poner copies_total en ${copiesTotal} porque hay ${activeLoans} copias prestadas.` },
          { status: 400 }
        );
      }
      newTotal = copiesTotal;
      newAvail = copiesTotal - activeLoans;
    }

    const title = titleRaw;
    const title_norm = title ? normalizeTitle(title) : null;

    const updated = await db.query(
      `
      UPDATE books
      SET
        title = COALESCE($2, title),
        title_norm = COALESCE($3, title_norm),
        author = CASE WHEN $4::text IS NULL THEN author ELSE $4 END,
        category = CASE WHEN $5::text IS NULL THEN category ELSE $5 END,
        pages = CASE WHEN $6::int IS NULL THEN pages ELSE $6 END,
        copies_total = $7,
        copies_available = $8
      WHERE id = $1
      RETURNING id, title, author, category, pages, copies_total, copies_available, updated_at;
      `,
      [id, title, title_norm, author, category, pages, newTotal, newAvail]
    );

    return NextResponse.json({ ok: true, data: updated.rows[0] });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Ya existe un libro con ese nombre." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error updating book" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    // Evitar borrar si hay préstamos activos
    const active = await db.query(
      `SELECT COUNT(*)::int AS c FROM loans WHERE book_id = $1 AND returned_at IS NULL`,
      [id]
    );
    if (active.rows[0].c > 0) {
      return NextResponse.json(
        { ok: false, error: "No puedes eliminar: hay préstamos activos de este libro." },
        { status: 400 }
      );
    }

    const del = await db.query(`DELETE FROM books WHERE id = $1`, [id]);
    if (del.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Libro no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error deleting book" },
      { status: 500 }
    );
  }
}
