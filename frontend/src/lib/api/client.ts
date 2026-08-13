/**
 * The only way this application talks to its data.
 *
 * The web tier holds no database credentials and opens no database connection.
 * Everything goes through here, server-side, to the API on the internal
 * network. That is the point of the split: a bug in a page cannot read a table
 * it had no business reading, because the page has no way to reach one.
 *
 * Two things travel on every call and they are not the same thing:
 *
 *   x-internal-key says "this request came from the web tier". It is a shared
 *   secret the browser never sees, and it is about the network boundary.
 *
 *   Authorization: Bearer <token> says "this request is acting as this user".
 *   It is read out of an httpOnly cookie the browser cannot script against, and
 *   it is about authorisation.
 *
 * Passing the first does not imply the second, which is why the API checks
 * roles separately.
 */

import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sc_session";

const BASE = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? "";

/** Carries the API's own message and status so a page can act on either. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reference?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Not signed in, or the session has expired. */
  get isUnauthorised(): boolean {
    return this.status === 401;
  }

  /** Signed in, but not allowed to do this. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the caller's session, for anything user-specific or admin-only. */
  auth?: boolean;
  /** Next.js caching, for reads that can stand to be a few seconds stale. */
  revalidate?: number | false;
  tags?: string[];
  /** For multipart uploads, where the body must not be JSON encoded. */
  formData?: FormData;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, revalidate, tags, formData, signal } = options;

  const headers: Record<string, string> = {};
  if (INTERNAL_KEY) headers["x-internal-key"] = INTERNAL_KEY;

  if (auth) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) headers.authorization = `Bearer ${token}`;
  }

  // Let fetch set the multipart boundary itself; setting Content-Type by hand
  // on a FormData body produces a request the server cannot parse.
  if (body !== undefined && !formData) headers["content-type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
    signal,
    // Anything carrying a session is per-user and must never be cached.
    cache: auth ? "no-store" : undefined,
    next: auth ? undefined : { revalidate: revalidate ?? 0, tags },
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : null) ?? `The server returned ${res.status}.`;
    const reference =
      parsed && typeof parsed === "object" && "reference" in parsed
        ? String((parsed as { reference: unknown }).reference)
        : undefined;
    throw new ApiError(res.status, message, reference);
  }

  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
