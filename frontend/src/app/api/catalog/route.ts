/**
 * The configurator's catalogue feed.
 *
 * This exists because the configurator is a client component: it fetches parts
 * as you type, re-homes a build when the deployment target changes, and
 * resolves a preset to concrete SKUs, all from the browser. The browser cannot
 * call the API directly and should not be able to: the API is not published
 * outside the Docker network, and the internal key that authorises a call must
 * never reach a page script.
 *
 * So the web tier proxies. This is a backend-for-frontend: it takes the shape
 * the browser finds convenient (one endpoint, a few query parameters) and turns
 * it into calls on the API, adding the internal key server-side.
 *
 * Read-only and unauthenticated by design. Everything here is public catalogue
 * data, the same data anybody can see by loading /catalog. Nothing user
 * specific goes through this route.
 */

import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/client";

export const runtime = "nodejs";

/**
 * Caps on anything that becomes part of an upstream URL.
 *
 * Not for correctness, the API validates its own inputs. This stops the web
 * tier being used to build an unbounded request against it.
 */
const MAX_IDS = 200;
const MAX_FAMILIES = 60;

function clampList(raw: string | null, max: number): string {
  return (raw ?? "").split(",").filter(Boolean).slice(0, max).join(",");
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;

  try {
    /**
     * Re-home a configuration into an enclosure that suits a new deployment
     * target, keeping every other part. Scored server-side against the whole
     * chassis catalogue.
     */
    const chassisFor = sp.get("chassisFor");
    if (chassisFor) {
      const ids = clampList(sp.get("ids"), MAX_IDS);
      return NextResponse.json(
        await api(`/catalog/chassis-for?for=${encodeURIComponent(chassisFor)}&ids=${encodeURIComponent(ids)}`),
      );
    }

    /** Resolve a preset's family keys to the SKUs we currently list. */
    const families = sp.get("families");
    if (families) {
      const wanted = clampList(families, MAX_FAMILIES);
      return NextResponse.json(await api(`/catalog/families?families=${encodeURIComponent(wanted)}`));
    }

    /** Rehydrate a configuration shared as a URL. */
    const ids = sp.get("ids");
    if (ids) {
      return NextResponse.json(
        await api(`/catalog/by-ids?ids=${encodeURIComponent(clampList(ids, MAX_IDS))}`),
      );
    }

    // Browse or search within a category, which is what the part picker does
    // on every keystroke.
    const forward = new URLSearchParams();
    for (const key of ["kind", "q", "page", "sort", "stock", "for", "condition", "segment", "brand", "tags", "min", "max"]) {
      const value = sp.get(key);
      if (value) forward.set(key, value.slice(0, 120));
    }
    return NextResponse.json(await api(`/catalog?${forward}`));
  } catch (e) {
    // The configurator shows its own message and carries on, so this answers
    // with a shape it can read rather than an HTML error page.
    const status = e instanceof ApiError ? e.status : 502;
    return NextResponse.json(
      { items: [], total: 0, page: 1, pages: 1, error: "The catalogue is unavailable just now." },
      { status },
    );
  }
}
