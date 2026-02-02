import db from "../../../../lib/db";

function csvEscape(value: any) {
  const s = String(value ?? "");
  // Si tiene comas, saltos de línea o comillas, se envuelve en comillas y se duplican comillas internas
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const result = await db.query(`
    SELECT
      title,
      author,
      category,
      pages,
      copies_total,
      copies_available
    FROM books
    ORDER BY title ASC
  `);

  const header = ["title", "author", "category", "pages", "copies_total", "copies_available"];
  const lines = [header.join(",")];

  for (const row of result.rows) {
    lines.push([
      csvEscape(row.title),
      csvEscape(row.author),
      csvEscape(row.category),
      csvEscape(row.pages),
      csvEscape(row.copies_total),
      csvEscape(row.copies_available),
    ].join(","));
  }

  const csv = lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="books-export-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
