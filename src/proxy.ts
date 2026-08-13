import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * A cheap first gate on the private routes.
 *
 * This only looks for the presence of the session cookie. It does not verify
 * it, and it must not: this code runs before every matching request, so it has
 * to stay fast, and a cookie can be forged anyway. Its job is to send signed-out
 * visitors to the sign-in page without spinning up a render.
 *
 * The checks that actually matter happen after it: the admin layout asks the API
 * who the token belongs to, and the API re-checks the token on every call it
 * receives. This one is convenience, those two are security.
 *
 * (This file used to be called middleware.ts. Next.js 16 renamed the convention
 * to proxy.ts; same thing, different name.)
 */
export function proxy(request: NextRequest) {
  const correlationId = request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  console.info(JSON.stringify({ level: "info", event: "request", correlationId, method: request.method, path: request.nextUrl.pathname }));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-correlation-id", correlationId);
  const signedIn = request.cookies.has("sc_session");
  const protectedPath = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/account");
  if (!protectedPath || signedIn) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-correlation-id", correlationId);
    return response;
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|hero-frames|hero-scroll.mp4).*)"],
};
