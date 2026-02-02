import db from "../../../../lib/db";

export async function GET() {
  const result = await db.query(`
    SELECT
      id,
      title,
      author,
      category,
      pages,
      copies_total,
      copies_available,
      created_at,
      updated_at
    FROM books
    ORDER BY title ASC
  `);

  const payload = {
    ok: true,
    exported_at: new Date().toISOString(),
    total: result.rows.length,
    data: result.rows,
  };

  const json = JSON.stringify(payload, null, 2);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="books-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}

