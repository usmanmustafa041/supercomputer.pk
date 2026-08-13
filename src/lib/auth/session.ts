/**
 * Who is signed in.
 *
 * The cookie holds a long random string and nothing else. It means nothing on
 * its own; the row it points at in the sessions table is what carries the
 * account. Two things follow from that: signing out really ends the session
 * rather than waiting for a token to expire, and nobody can read their own role
 * out of the cookie, let alone change it.
 */

import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { one, query } from "@/lib/db/client";
import { ensureReady } from "@/lib/db/init";
import type { Session, UserRow } from "@/lib/db/types";

export const SESSION_COOKIE = "sc_session";
const SESSION_DAYS = 14;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * SESSION_DAYS,
} as const;

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, userId, String(SESSION_DAYS)],
  );

  // Opportunistic tidy-up. Cheap, indexed, and saves needing a cron job for
  // the one housekeeping task this app has.
  await query("DELETE FROM sessions WHERE expires_at < now()");
  await query("DELETE FROM password_reset_tokens WHERE expires_at < now() OR used_at IS NOT NULL");
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await query("DELETE FROM sessions WHERE token = $1", [token]);
}

/** `cache` means several components asking in one render only hit the database once. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureReady();

  const row = await one<UserRow>(
    `SELECT u.id, u.email, u.full_name, u.organisation, u.role, u.totp_enabled
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1
        AND s.expires_at > now()
        AND u.is_active`,
    [token],
  );
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    organisation: row.organisation,
    totpEnabled: Boolean(row.totp_enabled),
  };
});

/**
 * The backstop on every write.
 *
 * The admin layout already redirects anyone who should not be here, but that
 * governs what gets drawn. This governs what gets done, and every action that
 * changes data calls it before touching anything.
 */
export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("Administrator access required.");
  return s;
}
