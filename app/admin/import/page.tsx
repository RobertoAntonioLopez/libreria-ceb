"use client";

import { useState } from "react";

export default function ImportPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runImport() {
    setLoading(true);
    setResult(null);
    try {
      const parsed = JSON.parse(text);
      const res = await fetch("/api/import/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? "Error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Importar libros</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pega el JSON de la app anterior. Se agrupa por título y se convierten duplicados en copias.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-xs font-medium text-slate-600">
            JSON
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-80 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-slate-300"
            placeholder='Pega aquí el JSON (array de objetos)...'
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={runImport}
              disabled={loading || !text.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Importando..." : "Importar"}
            </button>
            <a
              href="/books"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
            >
              Ver catálogo
            </a>
          </div>

          {result && (
            <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-50">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
