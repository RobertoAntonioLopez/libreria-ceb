"use client";

import { useEffect, useMemo, useState } from "react";

type Book = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  pages: number | null;
  copies_total: number;
  copies_available: number;
};

type BookForm = {
  title: string;
  author: string;
  category: string;
  pages: string; // manejamos como string para input
  copies_total: string;
};

const emptyForm: BookForm = {
  title: "",
  author: "",
  category: "",
  pages: "",
  copies_total: "1",
};

function toForm(b: Book): BookForm {
  return {
    title: b.title ?? "",
    author: b.author ?? "",
    category: b.category ?? "",
    pages: b.pages == null ? "" : String(b.pages),
    copies_total: String(b.copies_total ?? 1),
  };
}

export default function BooksPage() {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<Book | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    return sp.toString();
  }, [q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/books${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error");
      setBooks(json.data);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function openCreate() {
    setMode("create");
    setSelected(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(b: Book) {
    setMode("edit");
    setSelected(b);
    setForm(toForm(b));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function validate(f: BookForm) {
    if (!f.title.trim()) return "El título es obligatorio.";
    const copies = Number(f.copies_total);
    if (!Number.isInteger(copies) || copies < 1) return "Copias totales debe ser un entero >= 1.";
    if (f.pages.trim()) {
      const p = Number(f.pages);
      if (!Number.isFinite(p) || p < 1) return "Páginas debe ser un número válido (>= 1).";
    }
    return null;
  }

  async function submit() {
    const v = validate(form);
    if (v) {
      setFormError(v);
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      category: form.category.trim(),
      pages: form.pages.trim(),
      copies_total: Number(form.copies_total),
    };

    try {
      let res: Response;

      if (mode === "create") {
        res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/books/${selected!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error");

      setModalOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: Book) {
    const ok = confirm(`¿Eliminar "${b.title}"?\n\nNo se podrá eliminar si tiene préstamos activos.`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/books/${b.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error eliminando");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error eliminando");
    }
  }

  function loanLink(b: Book) {
    return `/loans?new=1&bookId=${encodeURIComponent(b.id)}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header pro + navegación */}
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Placeholder de logo: luego lo reemplazamos por <img src="/ceb-logo.png" .../> */}
              <div className="h-12 w-12 rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden flex items-center justify-center">
  <img
    src="/ceb-logo.png"
    alt="Logo CEB"
    className="h-10 w-10 object-contain"
  />
</div>

              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
  Sistema de Librería
  <span className="block text-sm font-medium text-slate-600">
    Centro Educativo Bautista
  </span>
</h1>

                <p className="text-sm text-slate-600">
                  Registro de libros, copias disponibles y préstamos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/books"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Libros
              </a>
              <a
                href="/loans"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Préstamos
              </a>
            </div>
          </div>
        </header>
	
        {/* Barra de acciones */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Biblioteca</h2>
            <p className="text-sm text-slate-600">Catálogo de libros · búsqueda y orden alfabético</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <div className="w-full sm:w-96">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Buscar (título, autor, categoría)
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: Aladino, Matemáticas, Pressman…"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-slate-300"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={openCreate}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                + Nuevo libro
              </button>

              <a
                href="/api/export/books"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Exportar JSON
              </a>

              <a
                href="/api/export/books-csv"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Exportar CSV
              </a>

              <a
                href="/import"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Importar
              </a>
            </div>
          </div>
        </div>


<button
  onClick={async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }}
  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
>
  Cerrar sesión
</button>


        {/* Tabla */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-medium">Listado</div>
            <div className="text-xs text-slate-500">
              {loading ? "Cargando…" : `${books.length} libros`}
            </div>
          </div>

          {error && <div className="px-4 py-3 text-sm text-red-600">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Autor / Categoría</th>
                  <th className="px-4 py-3">Páginas</th>
                  <th className="px-4 py-3">Copias</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!loading && books.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>
                      No hay resultados.
                    </td>
                  </tr>
                )}

                {books.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-slate-500">
                        Disponibles:{" "}
                        <span className={b.copies_available > 0 ? "text-emerald-700" : "text-red-700"}>
                          {b.copies_available}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm">{b.author ?? "—"}</div>
                      <div className="text-xs text-slate-500">{b.category ?? "—"}</div>
                    </td>

                    <td className="px-4 py-3">{b.pages ?? "—"}</td>

                    <td className="px-4 py-3">
                      <div className="text-sm">{b.copies_total}</div>
                      <div className="text-xs text-slate-500">total</div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Prestar (va a /loans con bookId preseleccionado) */}
                        <a
                          href={loanLink(b)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                            b.copies_available > 0
                              ? "border-slate-200 bg-white hover:bg-slate-50"
                              : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                          }`}
                          onClick={(e) => {
                            if (b.copies_available <= 0) e.preventDefault();
                          }}
                          title={b.copies_available > 0 ? "Crear préstamo" : "No hay copias disponibles"}
                        >
                          Prestar
                        </a>

                        <button
                          onClick={() => openEdit(b)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => remove(b)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Consejo: usa <b>Prestar</b> al lado de un libro para abrir préstamos con el libro ya seleccionado.
          </div>
        </div>
      </div>

      {/* Modal create/edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-sm font-semibold">
                  {mode === "create" ? "Nuevo libro" : "Editar libro"}
                </div>
                <div className="text-xs text-slate-500">
                  {mode === "create"
                    ? "Agrega un libro al catálogo."
                    : "Actualiza la información del libro."}
                </div>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="px-5 py-4">
              {formError && (
                <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Título</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                    placeholder="Ej: Álgebra de Baldor"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Autor</label>
                    <input
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Categoría</label>
                    <input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Páginas</label>
                    <input
                      value={form.pages}
                      onChange={(e) => setForm({ ...form, pages: e.target.value })}
                      inputMode="numeric"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Copias totales
                    </label>
                    <input
                      value={form.copies_total}
                      onChange={(e) => setForm({ ...form, copies_total: e.target.value })}
                      inputMode="numeric"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : mode === "create" ? "Crear" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
