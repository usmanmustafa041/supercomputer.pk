/**
 * Live price lookup against Pakistani retailers.
 *
 * Server-only. This is opt-in: without FIRECRAWL_API_KEY the site still works
 * and simply shows verified deep links instead of scraped prices. That is a
 * deliberate default — a stale or misparsed price is worse than no price.
 *
 * We only ever read from retailers marked `reach: "direct"`. Sites behind a
 * WAF are linked to and left alone.
 */

import "server-only";
import { retailersFor, type Retailer } from "./retailers";
import type { Product } from "../catalog/types";
import type { Offer } from "./index";

const KEY = process.env.FIRECRAWL_API_KEY;
const ENDPOINT = "https://api.firecrawl.dev/v2/scrape";

/** Rupee amounts as Pakistani sites write them: Rs 1,099,999 / ₨ 85,000 / PKR 12,500 */
const PRICE_RE = /(?:Rs\.?|PKR|₨)\s*([0-9][0-9,]{2,12})(?:\.\d{2})?/gi;

interface CacheEntry {
  at: number;
  offers: Offer[];
}

/**
 * In-process cache. Retailer prices do not move minute to minute, and every
 * lookup costs a credit, so an hour is a reasonable floor.
 */
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000;

export function liveLookupAvailable(): boolean {
  return Boolean(KEY);
}

function parsePrices(markdown: string, query: string): number[] {
  // Only trust prices that appear near a token from the query, so we do not
  // pick up the "Rs 5,700" of an unrelated card in a "related products" strip.
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const lines = markdown.split("\n");
  const out: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const window = lines.slice(Math.max(0, i - 3), i + 4).join(" ").toLowerCase();
    const hits = tokens.filter((t) => window.includes(t)).length;
    if (hits < Math.min(2, tokens.length)) continue;

    for (const m of lines[i].matchAll(PRICE_RE)) {
      const n = Number(m[1].replace(/,/g, ""));
      // Anything under 1000 rupees is a shipping line or a discount amount.
      if (n >= 1000 && n < 500_000_000) out.push(n);
    }
  }
  return out;
}

async function scrapeOne(r: Retailer, query: string, signal: AbortSignal): Promise<number[] | null> {
  if (!r.search || r.reach !== "direct") return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        url: r.search(query),
        formats: ["markdown"],
        onlyMainContent: true,
        // Firecrawl serves from its own cache within this window, which keeps
        // credit use sane when several people configure the same part.
        maxAge: 3_600_000,
        location: { country: "PK" },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { markdown?: string } };
    const md = json.data?.markdown;
    if (!md) return null;
    return parsePrices(md, query);
  } catch {
    return null;
  }
}

/**
 * Upgrades external offers with real prices where we can read them.
 * Offers we could not confirm are returned untouched and stay labelled
 * unconfirmed — never silently filled with a guess.
 */
export async function enrich(product: Product, offers: Offer[], budget = 4): Promise<Offer[]> {
  if (!KEY) return offers;

  const cacheKey = `${product.searchKey}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return mergeByseller(offers, hit.offers);

  const targets = retailersFor(product.kind)
    .filter((r) => r.reach === "direct" && r.search && !r.marketplace)
    .slice(0, budget);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20_000);

  const results = await Promise.all(
    targets.map(async (r) => ({ r, prices: await scrapeOne(r, product.searchKey, ac.signal) }))
  );
  clearTimeout(timer);

  const enriched: Offer[] = [];
  for (const { r, prices } of results) {
    if (!prices || !prices.length) continue;
    const low = Math.min(...prices);
    enriched.push({
      kind: "external",
      seller: r.name,
      sellerId: r.id,
      url: r.search!(product.searchKey),
      pricePkr: low,
      priceLabel: `from Rs ${low.toLocaleString("en-PK")}`,
      stock: -1,
      leadDays: -1,
      note: `Lowest of ${prices.length} matching listing${prices.length > 1 ? "s" : ""} read from ${r.host}. Confirm on their site before ordering.`,
      unconfirmed: false,
      city: r.city,
      marketplace: r.marketplace,
    });
  }

  CACHE.set(cacheKey, { at: Date.now(), offers: enriched });
  return mergeByseller(offers, enriched);
}

/** Replaces a link-only offer with its enriched twin, preserving order. */
function mergeByseller(base: Offer[], enriched: Offer[]): Offer[] {
  if (!enriched.length) return base;
  const byId = new Map(enriched.map((o) => [o.sellerId, o]));
  const merged = base.map((o) => byId.get(o.sellerId) ?? o);
  // Sort priced external offers ahead of unpriced ones, house offer stays first.
  const house = merged.filter((o) => o.kind !== "external");
  const ext = merged
    .filter((o) => o.kind === "external")
    .sort((a, b) => {
      if ((a.pricePkr == null) !== (b.pricePkr == null)) return a.pricePkr == null ? 1 : -1;
      return (a.pricePkr ?? 0) - (b.pricePkr ?? 0);
    });
  return [...house, ...ext];
}
