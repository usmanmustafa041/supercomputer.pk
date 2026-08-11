/**
 * Pakistani retailer registry.
 *
 * Every entry here was probed over HTTPS on the date in `verifiedAt`:
 * the host resolved, served a real page, and — where `searchVerified` is
 * true — its search endpoint returned results reflecting the query.
 *
 * Domains that failed to resolve were removed rather than shipped on a
 * hunch. Several real stores sit behind a WAF that rejects datacenter
 * traffic; those are marked `wafBlocked` and we link out to them without
 * ever attempting an automated price read.
 *
 * Re-run `npm run sourcing:verify` to refresh this file's claims.
 */

import type { Kind } from "../catalog/types";

export type Reach = "direct" | "waf-blocked" | "browse-only";

export interface Retailer {
  id: string;
  name: string;
  host: string;
  /** Public homepage. */
  url: string;
  city: string;
  /**
   * direct       — reachable and machine-readable; live lookup permitted.
   * waf-blocked  — a real store, but it rejects automated requests. Link only.
   * browse-only  — reachable, but no working search endpoint we could verify.
   */
  reach: Reach;
  /** ISO date this entry's claims were last checked against the live web. */
  verifiedAt: string;
  /** True when a search URL was probed and returned query-relevant results. */
  searchVerified: boolean;
  /** Builds a search URL. Undefined for browse-only entries. */
  search?: (q: string) => string;
  /** Kinds this retailer actually stocks, from inspecting their catalogue. */
  carries: Kind[];
  /** Marketplace listings are third-party sellers, not the platform itself. */
  marketplace: boolean;
  /** Honest note about what a buyer should expect from this seller. */
  note: string;
}

const enc = encodeURIComponent;

/** Checked 2026-08-11. See scripts/verify-sourcing.ts for the probe. */
export const VERIFIED_AT = "2026-08-11";

export const RETAILERS: Retailer[] = [
  {
    id: "qbit",
    name: "QBIT",
    host: "qbit.pk",
    url: "https://qbit.pk/",
    city: "Lahore",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://qbit.pk/?s=${enc(q)}&post_type=product`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler", "system"],
    marketplace: false,
    note: "PC components and prebuilt gaming systems. Stocks new and refurbished servers alongside desktop parts.",
  },
  {
    id: "toprated",
    name: "Toprated",
    host: "toprated.pk",
    url: "https://toprated.pk/",
    city: "Lahore",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: false,
    search: (q) => `https://toprated.pk/?s=${enc(q)}&post_type=product`,
    carries: ["system", "cpu", "memory", "storage", "nic", "switch", "rack", "pdu", "ups"],
    marketplace: false,
    note: "Enterprise-focused: rack, tower and blade servers, datacenter hardware. The closest local equivalent to what we sell.",
  },
  {
    id: "uniquesystems",
    name: "Unique Systems",
    host: "shop.uniquesystems.com.pk",
    url: "https://shop.uniquesystems.com.pk/",
    city: "Karachi",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://shop.uniquesystems.com.pk/?s=${enc(q)}&post_type=product`,
    carries: ["system", "cpu", "memory", "storage", "nic", "psu", "chassis"],
    marketplace: false,
    note: "New, used and refurbished servers and infrastructure parts. Strong on rack and blade spares.",
  },
  {
    id: "itechhub",
    name: "ITechHub",
    host: "itechhub.pk",
    url: "https://itechhub.pk/",
    city: "Rawalpindi",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://itechhub.pk/?s=${enc(q)}&post_type=product`,
    carries: ["nic", "cpu", "memory", "storage", "gpu", "motherboard", "psu"],
    marketplace: false,
    note: "New and used server components. One of the few local sources for 10G and 25G network cards.",
  },
  {
    id: "xeoncomputers",
    name: "Xeon Computers",
    host: "xeoncomputers.com.pk",
    url: "https://xeoncomputers.com.pk/",
    city: "Lahore",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://xeoncomputers.com.pk/?s=${enc(q)}&post_type=product`,
    carries: ["cpu", "motherboard", "memory", "storage", "gpu", "psu", "chassis"],
    marketplace: false,
    note: "Workstation and server components, weighted toward Intel Xeon platforms.",
  },
  {
    id: "zahcomputers",
    name: "Zah Computers",
    host: "zahcomputers.pk",
    url: "https://zahcomputers.pk/",
    city: "Lahore",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://zahcomputers.pk/?s=${enc(q)}&post_type=product`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler"],
    marketplace: false,
    note: "Broad component retailer with a large desktop parts catalogue.",
  },
  {
    id: "galaxy",
    name: "Galaxy",
    host: "galaxy.pk",
    url: "https://www.galaxy.pk/",
    city: "Karachi",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://www.galaxy.pk/search?q=${enc(q)}`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler", "ups"],
    marketplace: false,
    note: "Trading since 1991. Long-established, broad computing catalogue.",
  },
  {
    id: "zestro",
    name: "Zestro Gaming",
    host: "zestrogaming.com",
    url: "https://zestrogaming.com/",
    city: "Lahore",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://zestrogaming.com/?s=${enc(q)}&post_type=product`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler"],
    marketplace: false,
    note: "Gaming-focused. Good for consumer GPUs; not a source for datacenter parts.",
  },
  {
    id: "rbtech",
    name: "RB Tech and Games",
    host: "rbtechngames.com",
    url: "https://rbtechngames.com/",
    city: "Karachi",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://rbtechngames.com/?s=${enc(q)}&post_type=product`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler"],
    marketplace: false,
    note: "Lists new and used GPUs side by side with the condition stated on the listing.",
  },
  {
    id: "discountstore",
    name: "DiscountStore",
    host: "discountstore.pk",
    url: "https://discountstore.pk/",
    city: "Lahore",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://discountstore.pk/search?q=${enc(q)}`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu"],
    marketplace: false,
    note: "Carries higher-end consumer GPUs including PNY and other tier-two partners.",
  },
  {
    id: "shophive",
    name: "Shophive",
    host: "shophive.com",
    url: "https://www.shophive.com/",
    city: "Karachi",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://www.shophive.com/catalogsearch/result/?q=${enc(q)}`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "ups"],
    marketplace: false,
    note: "General electronics retailer with a genuine components section.",
  },
  {
    id: "tejar",
    name: "Tejar",
    host: "tejar.pk",
    url: "https://www.tejar.pk/",
    city: "Karachi",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://www.tejar.pk/catalogsearch/result/?q=${enc(q)}`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "ups"],
    marketplace: false,
    note: "General electronics with computing hardware. Import-led, so lead times vary.",
  },
  {
    id: "industech",
    name: "IndusTech",
    host: "industech.pk",
    url: "https://www.industech.pk/",
    city: "Karachi",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    // The OpenCart route returns 401; this path is the one that actually works.
    search: (q) => `https://www.industech.pk/search?search=${enc(q)}`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler"],
    marketplace: false,
    note: "Wide GPU range across price tiers.",
  },
  {
    id: "alfatah",
    name: "Al-Fatah",
    host: "alfatah.pk",
    url: "https://alfatah.pk/",
    city: "Lahore",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://alfatah.pk/search?q=${enc(q)}`,
    carries: ["storage", "memory", "ups"],
    marketplace: false,
    note: "Department store. Occasionally useful for consumer storage and UPS units, not for components.",
  },
  {
    id: "daraz",
    name: "Daraz",
    host: "daraz.pk",
    url: "https://www.daraz.pk/",
    city: "Nationwide",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://www.daraz.pk/catalog/?q=${enc(q)}`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler", "nic", "ups", "optic"],
    marketplace: true,
    note: "Marketplace, not a retailer. Listings are third-party sellers of varying reliability — check seller rating and warranty terms before ordering hardware of any value.",
  },
  {
    id: "olx",
    name: "OLX Pakistan",
    host: "olx.com.pk",
    url: "https://www.olx.com.pk/",
    city: "Nationwide",
    reach: "direct",
    verifiedAt: VERIFIED_AT,
    searchVerified: true,
    search: (q) => `https://www.olx.com.pk/items/q-${enc(q).replace(/%20/g, "-")}`,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "system", "rack", "nic", "switch"],
    marketplace: true,
    note: "Classified listings between individuals. Often the only local source for decommissioned enterprise gear — and entirely uninsured. Inspect in person and test before paying.",
  },

  // --- Real stores that reject automated requests. Link-out only. ---------
  {
    id: "czone",
    name: "Computer Zone",
    host: "czone.com.pk",
    url: "https://www.czone.com.pk/",
    city: "Karachi",
    reach: "waf-blocked",
    verifiedAt: VERIFIED_AT,
    searchVerified: false,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler"],
    marketplace: false,
    note: "Major established component retailer. Their firewall rejects automated requests, so we link to the site rather than read prices from it.",
  },
  {
    id: "paklap",
    name: "PakLap",
    host: "paklap.pk",
    url: "https://www.paklap.pk/",
    city: "Karachi",
    reach: "waf-blocked",
    verifiedAt: VERIFIED_AT,
    searchVerified: false,
    carries: ["storage", "memory", "gpu"],
    marketplace: false,
    note: "Primarily laptops, some components. Bot-protected, so link only.",
  },
  {
    id: "ishopping",
    name: "iShopping",
    host: "ishopping.pk",
    url: "https://www.ishopping.pk/",
    city: "Lahore",
    reach: "waf-blocked",
    verifiedAt: VERIFIED_AT,
    searchVerified: false,
    carries: ["gpu", "storage", "memory", "psu", "ups"],
    marketplace: false,
    note: "General electronics. Bot-protected, so link only.",
  },
  {
    id: "mega",
    name: "Mega.pk",
    host: "mega.pk",
    url: "https://www.mega.pk/",
    city: "Karachi",
    reach: "browse-only",
    verifiedAt: VERIFIED_AT,
    searchVerified: false,
    carries: ["gpu", "cpu", "motherboard", "memory", "storage", "psu"],
    marketplace: false,
    note: "Long-running price-comparison and retail site. Its search endpoint did not respond when probed, so we link to the homepage.",
  },
];

export const BY_ID = new Map(RETAILERS.map((r) => [r.id, r]));

/** Retailers that plausibly stock a given kind, best-reach first. */
export function retailersFor(kind: Kind): Retailer[] {
  const rank: Record<Reach, number> = { direct: 0, "waf-blocked": 1, "browse-only": 2 };
  return RETAILERS.filter((r) => r.carries.includes(kind)).sort((a, b) => {
    // Real shops before marketplaces; reachable before blocked.
    if (a.marketplace !== b.marketplace) return a.marketplace ? 1 : -1;
    if (rank[a.reach] !== rank[b.reach]) return rank[a.reach] - rank[b.reach];
    if (a.searchVerified !== b.searchVerified) return a.searchVerified ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
