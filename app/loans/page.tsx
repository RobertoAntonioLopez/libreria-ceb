"use client";

import { useEffect, useMemo, useState } from "react";

type LoanRow = {
  id: string;
  borrower: string;
  borrow_date: string;
  due_date: string;
  returned_at: string | null;
  book_id: string;
  title: string;
  author: string | null;
  category: string | null;
};

type BookRow = {
  id: string;
  title: string;
  copies_available: number;
};

function formatDMY(iso: string) {
  // En RD normalmente sale dd/mm/yyyy
  return new Date(iso).toLocaleDateString("es-DO");
}

function addDaysToToday(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
}

export default function LoansPage() {
  const [status, setStatus] = useState<"active" | "overdue" | "all" | "returned">("active");
  const [q, setQ] = useState("");
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [bookSearch, setBookSearch] = useState("");
  const [bookId, setBookId] = useState("");
  const [borrower, setBorrower] = useState("");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [days, setDays] = useState(""); // "7", "14", etc
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    return sp.toString();
  }, [status, q]);

  async function loadLoans() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loans?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error");
      setLoans(json.data);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(loadLoans, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  async function openCreate() {
    setFormError(null);
    setBookId("");
    setBookSearch("");
    setBorrower("");
    setDueDate("");
    setDays("");

    const res = await fetch("/api/books", { cache: "no-store" });
    const json = await res.json();

    if (json.ok) {
      const opts = (json.data as any[])
        .map((b) => ({ id: b.id, title: b.title, copies_available: b.copies_available }))
        .filter((b) => b.copies_available > 0)
        .sort((a, b) => a.title.localeCompare(b.title));
      setBooks(opts);
    } else {
      setBooks([]);
    }

    setOpen(true);
  }

  const filteredBooks = useMemo(() => {
    const s = bookSearch.trim().toLowerCase();
    if (!s) return books.slice(0, 60);
    const out = books.filter((b) => b.title.toLowerCase().includes(s));
    return out.slice(0, 60);
  }, [books, bookSearch]);

  function setDueFromDays(value: string) {
    // solo números enteros
    const clean = value.replace(/[^\d]/g, "");
    setDays(clean);

    const n = Number(clean);
    if (Number.isFinite(n) && n > 0) {
      setDueDate(addDaysToToday(n));
    } else {
      // si borra el campo, no tocamos la fecha (por si el usuario la eligió manual)
      if (!clean) {
        // nada
      }
    }
  }

  async function createLoan() {
    setFormError(null);

    if (!bookId) return setFormError("Selecciona un libro.");
    if (!borrower.trim()) return setFormError("Escribe el nombre del prestatario.");
    if (!dueDate) return setFormError("Selecciona la fecha límite o escribe los días.");

    setSaving(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: bookId,
          borrower: borrower.trim(),
          due_date: dueDate,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error");

      setOpen(false);
      await loadLoans();
    } catch (e: any) {
      setFormError(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  async function returnLoan(id: string) {
    const ok = confirm("¿Marcar este préstamo como devuelto?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/loans/${id}/return`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error");
      await loadLoans();
    } catch (e: any) {
      alert(e?.message ?? "Error");
    }
  }

  function badge(due: string, returnedAt: string | null) {
    if (returnedAt) {
      return (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          Devuelto
        </span>
      );
    }
    const dueTime = new Date(due).getTime();
    if (dueTime < Date.now()) {
      return (
        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
          Vencido
        </span>
      );
    }
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        Activo
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/books"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Libros
            </a>

            <a
              href="/loans"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Préstamos
            </a>

            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Préstamos</h1>
            <p className="text-sm text-slate-600">Control de préstamos, vencidos y devoluciones</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <div className="w-full sm:w-96">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Buscar (libro, prestatario, autor, categoría)
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Ej: "Diccionario", "Juan Pérez"...'
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-slate-300"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="active">Activos</option>
                <option value="overdue">Vencidos</option>
                <option value="all">Todos</option>
                <option value="returned">Devueltos</option>
              </select>

              <button
                onClick={openCreate}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                + Nuevo préstamo
              </button>

              <a
                href="/books"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Ver libros
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-medium">Listado</div>
            <div className="text-xs text-slate-500">{loading ? "Cargando…" : `${loans.length} registros`}</div>
          </div>

          {error && <div className="px-4 py-3 text-sm text-red-600">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Libro</th>
                  <th className="px-4 py-3">Prestatario</th>
                  <th className="px-4 py-3">Prestado</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!loading && loans.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>
                      No hay resultados.
                    </td>
                  </tr>
                )}

                {loans.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{badge(l.due_date, l.returned_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.title}</div>
                      <div className="text-xs text-slate-500">
                        {(l.author ?? "—")} · {(l.category ?? "—")}
                      </div>
                    </td>
                    <td className="px-4 py-3">{l.borrower}</td>
                    <td className="px-4 py-3">{formatDMY(l.borrow_date)}</td>
                    <td className="px-4 py-3">{formatDMY(l.due_date)}</td>
                    <td className="px-4 py-3 text-right">
                      {l.returned_at ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <button
                          onClick={() => returnLoan(l.id)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                          Marcar devuelto
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Al crear un préstamo se descuenta 1 copia disponible; al devolver se suma 1.
          </div>
        </div>
      </div>

      {/* Modal nuevo préstamo */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-sm font-semibold">Nuevo préstamo</div>
                <div className="text-xs text-slate-500">
                  Busca un libro, escribe el prestatario y define la fecha límite.
                </div>
              </div>
              <button
                onClick={() => !saving && setOpen(false)}
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

              {/* Buscar libro */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Buscar libro</label>
                <input
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Escribe parte del título..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                />
              </div>

              {/* Seleccionar libro */}
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Seleccionar libro</label>
                <select
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Selecciona —</option>
                  {filteredBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (disp: {b.copies_available})
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-slate-500">
                  Mostrando hasta 60 resultados.
                </div>
              </div>

              {/* Prestatario */}
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">Prestatario</label>
                <input
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                  placeholder="Robbie Lopez (6to Sec.)"
                />
              </div>

              {/* Fecha límite por días o por calendario */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Días (opcional)
                  </label>
                  <input
                    value={days}
                    onChange={(e) => setDueFromDays(e.target.value)}
                    inputMode="numeric"
                    placeholder="Ej: 7"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    Escribes días y se calcula la fecha automáticamente.
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setDays("");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    Se mostrará en la tabla como dd/mm/yyyy.
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDueFromDays("7")}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  +7 días
                </button>
                <button
                  type="button"
                  onClick={() => setDueFromDays("14")}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  +14 días
                </button>
                <button
                  type="button"
                  onClick={() => setDueFromDays("30")}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  +30 días
                </button>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => !saving && setOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={createLoan}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Crear préstamo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
