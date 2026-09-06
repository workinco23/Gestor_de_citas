import type { AdminUser } from "./api";

const SESSION_KEY = "aurora_admin_session";

export interface AdminSession {
  token: string;
  user: AdminUser;
}

function decodeJwtPayload(token: string): { exp?: number } {
  // Los JWT usan base64url (-/_ sin padding), no base64 estándar (+//) —
  // atob() directo falla en cuanto el payload contiene esos bytes.
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
}

export function loadSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (!session?.token) return null;
    const payload = decodeJwtPayload(session.token);
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
