import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Who is signed in, so the site header can show the right link.
 *
 * The header asks for this from the browser rather than the root layout reading
 * the cookie. Reading a cookie in the root layout would make every page render
 * per request, including the ones with no personal content that should stay
 * cached. One small call keeps the rest static.
 */
export async function GET() {
  const session = await getSession();
  return NextResponse.json(session, { headers: { "cache-control": "private, no-store" } });
}
