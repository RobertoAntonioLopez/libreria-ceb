import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { normalizeTitle } from "../../../lib/normalize";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  try {
    // Búsqueda por título/autor/categoría, orden alfabético
    const sql = q
      ? `
        SELECT id, title, author, category, pages, copies_total, copies_available, created_at, updated_at
        FROM books
        WHERE title ILIKE $1 OR author ILIKE $1 OR category ILIKE $1
        ORDER BY title ASC
        LIMIT 500;
      `
      : `
        SELECT id, title, author, category, pages, copies_total, copies_available, created_at, updated_at
        FROM books
        ORDER BY title ASC
        LIMIT 500;
      `;

    const params = q ? [`%${q}%`] : [];
    const result = await db.query(sql, params);

    return NextResponse.json({ ok: true, data: result.rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error loading books" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    const author = String(body.author ?? "").trim() || null;
    const category = String(body.category ?? "").trim() || null;
    const pages = body.pages === "" || body.pages == null ? null : Number(body.pages);
    const copiesTotal = body.copies_total == null ? 1 : Number(body.copies_total);

    if (!title) {
      return NextResponse.json({ ok: false, error: "El título es obligatorio." }, { status: 400 });
    }
    if (Number.isNaN(pages as any) && pages !== null) {
      return NextResponse.json({ ok: false, error: "Pages debe ser un número." }, { status: 400 });
    }
    if (!Number.isInteger(copiesTotal) || copiesTotal < 1) {
      return NextResponse.json(
        { ok: false, error: "copies_total debe ser un entero >= 1." },
        { status: 400 }
      );
    }

    const title_norm = normalizeTitle(title);

    const insert = await db.query(
      `
      INSERT INTO books (title, title_norm, author, category, pages, copies_total, copies_available)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING id, title, author, category, pages, copies_total, copies_available;
      `,
      [title, title_norm, author, category, pages, copiesTotal]
    );

    return NextResponse.json({ ok: true, data: insert.rows[0] }, { status: 201 });
  } catch (err: any) {
    // 23505 = unique violation (título duplicado)
    if (err?.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Ya existe un libro con ese nombre." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error creating book" },
      { status: 500 }
    );
  }
}
