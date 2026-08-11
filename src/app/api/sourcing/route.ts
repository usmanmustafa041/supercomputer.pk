import { NextResponse } from "next/server";
import { getById, getBySlug } from "@/lib/catalog";
import { resolve } from "@/lib/sourcing";
import { enrich, liveLookupAvailable } from "@/lib/sourcing/live";

export const runtime = "nodejs";

/**
 * GET /api/sourcing?id=G-XXXXXXX[&live=1]
 *
 * Returns where a SKU can be bought: our own stock first, then verified
 * Pakistani retailers. `live=1` attempts real price reads where a key is
 * configured; without one the response is deep links only and says so.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const slug = url.searchParams.get("slug");
  const wantLive = url.searchParams.get("live") === "1";

  if (!id && !slug) {
    return NextResponse.json({ error: "Pass id or slug." }, { status: 400 });
  }

  const product = id ? getById(id) : getBySlug(slug!);
  if (!product) {
    return NextResponse.json({ error: "No such SKU." }, { status: 404 });
  }

  const result = resolve(product);
  const live = wantLive && liveLookupAvailable();
  const offers = live ? await enrich(product, result.offers) : result.offers;

  return NextResponse.json(
    {
      ...result,
      offers,
      liveLookup: {
        requested: wantLive,
        performed: live,
        reason: live
          ? null
          : wantLive
            ? "FIRECRAWL_API_KEY is not set, so external prices were not read. Links below go to each retailer's live search."
            : null,
      },
    },
    {
      headers: {
        // Retailer stock is not real-time data; a short edge cache is fine.
        "cache-control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    }
  );
}
