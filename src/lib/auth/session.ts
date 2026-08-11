/**
 * Who is signed in, from the server's point of view.
 *
 * `getSession()` asks the API rather than trusting anything in the cookie
 * beyond the token itself. The token is signed, so it could be decoded here
 * without a round trip, but then a disabled account or a demoted admin would
 * keep its old powers until the token expired. Asking is cheap and correct.
 */

import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { api, SESSION_COOKIE } from "@/lib/api/server";
import { toSession, type Session, type User } from "@/lib/api/types";

/** `cache` dedupes this within a single render pass. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return toSession(await api<User>("/api/auth/me", { token }));
  } catch {
    // Expired, tampered with, or the account is gone. Same answer either way.
    return null;
  }
});

export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (!s || s.role !== "admin") {
    // The layout redirects before this ever throws; this is the backstop for
    // anything that reaches a data call without passing the layout.
    throw new Error("Administrator access required.");
  }
  return s;
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // Matches the token lifetime the API issues.
  maxAge: 60 * 60 * 12,
} as const;
