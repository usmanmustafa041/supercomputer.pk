import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Who is signed in, for the header to draw the right link.
 *
 * The header asks for this from the browser rather than the root layout reading
 * the cookie directly. Reading a cookie in the root layout would make every page
 * on the site render per request, including the pages that have no personal
 * content and should stay cached. One small call keeps the rest static.
 */
export async function GET() {
  const session = await getSession();
  return NextResponse.json(session, {
    headers: { "cache-control": "private, no-store" },
  });
}
