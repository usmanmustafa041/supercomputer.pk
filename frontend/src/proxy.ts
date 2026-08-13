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
  const signedIn = request.cookies.has("sc_session");
  if (signedIn) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
