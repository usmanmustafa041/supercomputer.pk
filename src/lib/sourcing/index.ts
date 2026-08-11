/**
 * Sourcing resolution.
 *
 * Order of preference, always:
 *   1. Our own stock, if we physically hold the unit.
 *   2. Our indent channel, if we can import it against a confirmed order.
 *   3. Verified Pakistani retailers, ranked by whether they actually stock
 *      the category and whether we could reach them.
 *
 * What this module will not do is invent a price. An external offer carries
 * a live price only when `live.ts` fetched one; otherwise it is a deep link
 * to that retailer's own search results and is labelled as such.
 */

import type { Product } from "../catalog/types";
import { fmtPkr } from "../catalog";
import { retailersFor, type Retailer } from "./retailers";

export type OfferKind = "in-house" | "indent" | "external";

export interface Offer {
  kind: OfferKind;
  /** Who is selling. */
  seller: string;
  sellerId: string;
  /** Where to go. For external offers this is a search results page. */
  url: string;
  /** Populated for our own offers, and for external ones only after a live read. */
  pricePkr?: number;
  priceLabel: string;
  /** Units we hold. -1 when unknown (which is the honest answer externally). */
  stock: number;
  leadDays: number;
  /** Short, factual line about what this offer is. */
  note: string;
  /** True when we have not confirmed the item is actually there. */
  unconfirmed: boolean;
  city?: string;
  marketplace?: boolean;
}

export interface SourcingResult {
  product: Product;
  query: string;
  offers: Offer[];
  /** True when we can fulfil it ourselves without going outside. */
  selfServed: boolean;
  checkedAt: string;
}

/** Our own offer for a SKU, derived from the catalog's availability record. */
function houseOffer(p: Product): Offer {
  if (p.avail.inHouse > 0) {
    return {
      kind: "in-house",
      seller: "TERAFORGE",
      sellerId: "teraforge",
      url: `/product/${p.slug}`,
      pricePkr: p.price.pkr,
      priceLabel: p.price.onRequest ? "On request" : fmtPkr(p.price.pkr),
      stock: p.avail.inHouse,
      leadDays: 0,
      note: `${p.avail.inHouse} in stock, tested and ready to dispatch.`,
      unconfirmed: false,
      city: "Lahore",
    };
  }

  return {
    kind: "indent",
    seller: "TERAFORGE",
    sellerId: "teraforge",
    url: `/product/${p.slug}`,
    pricePkr: p.price.onRequest ? undefined : p.price.pkr,
    priceLabel: p.price.onRequest ? "Quoted on request" : fmtPkr(p.price.pkr),
    stock: 0,
    leadDays: p.avail.leadDays,
    note: p.avail.indentOnly
      ? `Imported against a confirmed order. ${p.avail.leadDays} working days, duty and clearing included in the quoted price.`
      : `Not held locally right now. ${p.avail.leadDays} working days from our regional stock.`,
    unconfirmed: false,
    city: "Lahore",
  };
}

function externalOffer(p: Product, r: Retailer): Offer {
  const url = r.search ? r.search(p.searchKey) : r.url;
  return {
    kind: "external",
    seller: r.name,
    sellerId: r.id,
    url,
    priceLabel: "Check on site",
    stock: -1,
    leadDays: -1,
    note:
      r.reach === "waf-blocked"
        ? `${r.note} We cannot read stock automatically from this site.`
        : r.search
          ? `Opens a live search for "${p.searchKey}" on ${r.host}.`
          : `${r.note}`,
    unconfirmed: true,
    city: r.city,
    marketplace: r.marketplace,
  };
}

/**
 * Static resolution: no network. Returns our own offer first, then verified
 * retailer deep links. `live.ts` upgrades external offers with real prices
 * when it is configured to.
 */
export function resolve(p: Product, limit = 6): SourcingResult {
  const house = houseOffer(p);
  const externals = retailersFor(p.kind)
    .filter((r) => {
      // Never send someone to a classifieds site for a brand-new sealed part.
      if (r.marketplace && p.condition === "new" && p.price.pkr > 2_000_000) return false;
      return true;
    })
    .slice(0, limit)
    .map((r) => externalOffer(p, r));

  return {
    product: p,
    query: p.searchKey,
    offers: [house, ...externals],
    selfServed: house.kind === "in-house",
    checkedAt: new Date().toISOString(),
  };
}

export { RETAILERS, retailersFor, VERIFIED_AT } from "./retailers";
export type { Retailer } from "./retailers";
