"use client";

import { useState } from "react";
import { adminLogin } from "@/lib/api";
import { saveSession, type AdminSession } from "@/lib/session";

export function LoginScreen({
  onLogin,
  notice,
}: {
  onLogin: (session: AdminSession) => void;
  notice?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const { token, user } = await adminLogin(email, password);
      const session = { token, user };
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-navy">
      <form
        onSubmit={handleSubmit}
        className="flex w-80 flex-col gap-3 rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="mb-2 text-center">
          <p className="text-lg font-semibold text-gray-800">Aurora Beauty</p>
          <p className="text-xs text-gray-400">Lounge — Admin</p>
        </div>

        {notice && (
          <p className="rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700">{notice}</p>
        )}
        {error && <p className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-600">{error}</p>}

        <label className="text-xs font-medium text-gray-500">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recepcion@aurorabeauty.pe"
          autoComplete="username"
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />

        <label className="text-xs font-medium text-gray-500">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />

        <button
          type="submit"
          disabled={!email || !password || submitting}
          className="mt-2 rounded-md bg-burdeos py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
