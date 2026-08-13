/**
 * The shapes the API returns.
 *
 * Written here rather than imported from the backend on purpose: the web tier
 * must not depend on the API's internals, only on its contract. Anything both
 * tiers genuinely share, a Product or a compatibility Finding, comes from
 * @supercomputers/shared instead, which is where a single definition belongs.
 */

export type Role = "admin" | "customer";
export type QuoteStatus = "new" | "in_review" | "quoted" | "won" | "lost";
export type PresetTarget = "desk" | "rack" | "cluster";

export interface SessionUser {
  id: number;
  email: string;
  role: Role;
  fullName: string | null;
  organisation: string | null;
}

export interface ProductRow {
  id: number;
  sku: string;
  slug: string;
  kind: string;
  brand: string;
  model: string;
  mpn: string | null;
  family: string;
  condition: string;
  segment: string;
  price_pkr: number;
  price_on_request: boolean;
  stock_qty: number;
  lead_days: number;
  indent_only: boolean;
  warranty_months: number;
  release_year: number;
  search_key: string;
  highlights: string[];
  tags: string[];
  specs: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  sku: string;
  object_key: string;
  original_name: string | null;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  position: number;
}

export interface PresetPick {
  family: string;
  qty: number;
  variant?: string;
}

export interface PresetRow {
  id: number;
  slug: string;
  name: string;
  role: string;
  target: PresetTarget;
  blurb: string;
  picks: PresetPick[];
  position: number;
  is_active: boolean;
}

export interface QuoteLine {
  sku: string;
  qty: number;
  brand?: string;
  model?: string;
  kind?: string;
  condition?: string;
}

export interface QuoteRow {
  id: number;
  reference: string;
  user_id: number | null;
  contact_name: string;
  contact_email: string;
  organisation: string | null;
  phone: string | null;
  city: string | null;
  timeline: string | null;
  target: string;
  workloads: string[];
  notes: string | null;
  lines: QuoteLine[];
  summary: Record<string, unknown>;
  findings: Array<Record<string, unknown>>;
  status: QuoteStatus;
  internal_note: string | null;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  new: "New",
  in_review: "Being reviewed",
  quoted: "Quote sent",
  won: "Ordered",
  lost: "Closed",
};
