/**
 * Server-only access to the API.
 *
 * Nothing in the browser ever calls the FastAPI service directly. The browser
 * calls this Next.js app, this file calls the API, and the answer comes back.
 * Three things fall out of that arrangement:
 *
 *   1. The sign-in token lives in a cookie marked httpOnly, so page scripts
 *      cannot read it. A token kept in localStorage is readable by any script
 *      that ends up on the page, which is how stolen sessions usually happen.
 *   2. There is no cross-origin traffic, so no CORS to configure or get wrong.
 *   3. In a real deployment the API needs no public address at all. It can sit
 *      on the private container network with only the website exposed.
 *
 * The cost is one extra hop inside the datacentre, which is microseconds.
 */

import "server-only";
import { cookies } from "next/headers";

/** Container-to-container inside compose; localhost when running bare. */
const BASE = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const SESSION_COOKIE = "sc_session";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Opts = {
  method?: string;
  body?: unknown;
  /** Attach the signed-in user's token. Off by default, so it is deliberate. */
  auth?: boolean;
  /** Seconds. Omitted means no caching, which is right for anything personal. */
  revalidate?: number;
  token?: string;
};

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };

  let token = opts.token;
  if (opts.auth && !token) {
    token = (await cookies()).get(SESSION_COOKIE)?.value;
  }
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    // Personal data must not be cached; catalog reads may be.
    cache: opts.revalidate === undefined ? "no-store" : undefined,
    next: opts.revalidate === undefined ? undefined : { revalidate: opts.revalidate },
  });

  if (!res.ok) {
    // FastAPI puts the human-readable reason in `detail`. Fall back to the
    // status text so a proxy error still says something useful.
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* not JSON; the status text will do */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** True when the API answers at all. Used by the admin pages to explain outages. */
export async function apiReachable(): Promise<boolean> {
  try {
    await api("/api/health", { revalidate: 5 });
    return true;
  } catch {
    return false;
  }
}
