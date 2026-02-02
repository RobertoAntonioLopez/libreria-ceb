import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { normalizeTitle } from "../../../../lib/normalize";

type OldBook = {
  id?: number | string;
  name?: string;
  author?: string | null;
  category?: string | null;
  pages?: number | null;
  available?: boolean;
  borrower?: string | null;
  borrowDate?: string | null;
};

function safeText(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    // Soportamos:
    // 1) JSON directo: [{...}, {...}]
    // 2) { items: [...] }
    const body = await req.json();
    const items: OldBook[] = Array.isArray(body) ? body : body?.items;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { ok: false, error: "Formato inválido. Debe ser un array de libros o { items: [...] }" },
        { status: 400 }
      );
    }

    // Agrupar por title_norm
    const groups = new Map<
      string,
      {
        title: string;
        author: string | null;
        category: string | null;
        pages: number | null;
        copies_total: number;
        copies_available: number;
      }
    >();

    for (const it of items) {
      const title = String(it?.name ?? "").trim();
      if (!title) continue;

      const title_norm = normalizeTitle(title);
      const available = it?.available !== false; // si falta, asumimos disponible

      if (!groups.has(title_norm)) {
        const pages = it?.pages == null ? null : Number(it.pages);
        groups.set(title_norm, {
          title,
          author: safeText(it?.author),
          category: safeText(it?.category),
          pages: Number.isFinite(pages as any) ? (pages as number) : null,
          copies_total: 0,
          copies_available: 0,
        });
      }

      const g = groups.get(title_norm)!;
      g.copies_total += 1;
      if (available) g.copies_available += 1;

      // Si vienen metadatos mejores en otro registro, los guardamos
      if (!g.author && safeText(it?.author)) g.author = safeText(it?.author);
      if (!g.category && safeText(it?.category)) g.category = safeText(it?.category);
      if (g.pages == null && it?.pages != null) {
        const p = Number(it.pages);
        if (Number.isFinite(p)) g.pages = p;
      }
    }

    const values = Array.from(groups.entries()).map(([title_norm, g]) => ({
      title_norm,
      ...g,
    }));

    // Transacción: UPSERT (si ya existía el libro, suma copias)
    await db.query("BEGIN");

    let inserted = 0;
    let updated = 0;

    for (const v of values) {
      // Si existe, sumamos copias (no duplicamos título)
      const res = await db.query(
        `
        INSERT INTO books (title, title_norm, author, category, pages, copies_total, copies_available)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (title_norm) DO UPDATE SET
          title = EXCLUDED.title,
          author = COALESCE(books.author, EXCLUDED.author),
          category = COALESCE(books.category, EXCLUDED.category),
          pages = COALESCE(books.pages, EXCLUDED.pages),
          copies_total = books.copies_total + EXCLUDED.copies_total,
          copies_available = books.copies_available + EXCLUDED.copies_available
        RETURNING (xmax = 0) AS inserted;
        `,
        [
          v.title,
          v.title_norm,
          v.author,
          v.category,
          v.pages,
          v.copies_total,
          v.copies_available,
        ]
      );

      if (res.rows[0]?.inserted) inserted++;
      else updated++;
    }

    await db.query("COMMIT");

    return NextResponse.json({
      ok: true,
      message: "Importación completada.",
      stats: {
        unique_titles_in_file: values.length,
        inserted_titles: inserted,
        updated_titles: updated,
        total_rows_in_file: items.length,
      },
    });
  } catch (err: any) {
    try {
      await db.query("ROLLBACK");
    } catch {}
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error importing books" },
      { status: 500 }
    );
  }
}
