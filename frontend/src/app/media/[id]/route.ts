/**
 * Passes a photograph through from the API.
 *
 * The bucket is private and the API is not reachable from a browser, so the
 * bytes have to come through this origin. It is a proxy and deliberately
 * nothing more: no credentials of its own beyond the internal key, no knowledge
 * of where the object lives, no decision about who may see it.
 *
 * In a real deployment a CDN would sit in front of this. The immutable cache
 * header is what makes that work: the id maps to a content-hashed object, so a
 * given URL can never return different bytes and may be cached forever.
 */

import { api } from "@/lib/api/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Only a positive integer is a possible row id. Anything else is refused here
  // rather than forwarded, so nothing malformed reaches the API at all.
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });

  const base = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const upstream = await fetch(`${base}/products/images/${id}/raw`, {
    headers: process.env.INTERNAL_API_KEY ? { "x-internal-key": process.env.INTERNAL_API_KEY } : {},
    // Streamed straight through rather than buffered, so a large photograph
    // does not sit in this process's heap on its way to the browser.
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      // The bytes are whatever was uploaded. Make certain a browser renders
      // them as an image and never as a document inside our own origin.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Unused, but re-exported so the module is not tree-shaken into nothing when
// only the type is imported elsewhere.
export const dynamic = "force-dynamic";
