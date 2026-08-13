/**
 * Who is signed in, from the web tier's point of view.
 *
 * The web tier holds the cookie and nothing else. It cannot mint a session, it
 * cannot read the sessions table, and it cannot decide what a token is worth:
 * it forwards the token to the API and believes the answer. That keeps one
 * authority for identity rather than two implementations that can disagree.
 *
 * The cookie is httpOnly, so page scripts cannot read it. A cross-site script
 * on this origin still cannot walk away with a usable credential.
 */

import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { ApiError } from "@/lib/api/client";
import { auth as authApi } from "@/lib/api/resources";
import type { SessionUser } from "@/lib/api/types";

export const SESSION_COOKIE = "sc_session";
const SESSION_DAYS = 14;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * SESSION_DAYS,
} as const;

/**
 * `cache` means several components asking in one render only make one call.
 *
 * The layout, the header and the page all want to know who is signed in, and
 * without this each of them would be a separate round trip to the API for the
 * same answer.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return await authApi.me();
  } catch (e) {
    // An expired or revoked session is a normal outcome, not an error worth
    // showing. Anything else is worth knowing about, so it is not swallowed.
    if (e instanceof ApiError && (e.isUnauthorised || e.isForbidden)) return null;
    throw e;
  }
});

/**
 * The web tier's own gate, and not the one that matters.
 *
 * This decides what gets drawn. The API decides what gets done, and it checks
 * the role again on every write, because a server action is a POST endpoint
 * that anyone can call whether or not the UI ever rendered a button for it.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("Administrator access required.");
  return s;
}
