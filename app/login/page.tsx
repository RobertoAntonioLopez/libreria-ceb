"use client";

import { useState } from "react";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error");

      window.location.href = "/books";
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <img src="/ceb-logo.png" alt="Logo CEB" className="h-10 w-10 rounded-xl object-contain" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Sistema de Librería</h1>
              <p className="text-sm text-slate-600">Centro Educativo Bautista</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {err && (
            <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Usuario</label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                placeholder="Ari2511"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Contraseña</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Acceso restringido al personal autorizado.
          </p>
        </div>
      </div>
    </div>
  );
}
