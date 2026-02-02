import { NextResponse } from "next/server";
import db from "../../../../../lib/db";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    await db.query("BEGIN");

    // Bloquear el préstamo
    const loanRes = await db.query(
      `SELECT id, book_id, returned_at FROM loans WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (loanRes.rowCount === 0) {
      await db.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Préstamo no encontrado." }, { status: 404 });
    }

    const loan = loanRes.rows[0];

    if (loan.returned_at) {
      await db.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Este préstamo ya fue devuelto." }, { status: 400 });
    }

    // Bloquear libro para actualizar copias de forma segura
    const bookRes = await db.query(
      `SELECT id, copies_total, copies_available FROM books WHERE id = $1 FOR UPDATE`,
      [loan.book_id]
    );

    if (bookRes.rowCount === 0) {
      await db.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Libro del préstamo no encontrado." }, { status: 404 });
    }

    // Marcar como devuelto
    const updatedLoan = await db.query(
      `UPDATE loans SET returned_at = now() WHERE id = $1 RETURNING id, returned_at`,
      [id]
    );

    // Sumar una copia disponible sin pasarse del total
    await db.query(
      `UPDATE books
       SET copies_available = LEAST(copies_total, copies_available + 1)
       WHERE id = $1`,
      [loan.book_id]
    );

    await db.query("COMMIT");

    return NextResponse.json({
      ok: true,
      message: "Libro devuelto.",
      data: updatedLoan.rows[0],
    });
  } catch (err: any) {
    try {
      await db.query("ROLLBACK");
    } catch {}
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error returning loan" },
      { status: 500 }
    );
  }
}
