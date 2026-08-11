/**
 * What a row looks like coming back from Postgres.
 *
 * These are the only shapes the rest of the app deals in. Because the queries
 * and the pages are now the same TypeScript project, there is nothing to keep
 * in sync by hand: change a column here and every page that reads it stops
 * compiling until it is updated.
 */

export type Role = "admin" | "customer";
export type QuoteStatus = "new" | "in_review" | "quoted" | "won" | "lost";

export interface UserRow {
  id: number;
  email: string;
  full_name: string | null;
  organisation: string | null;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
}

/** Everything the browser is allowed to know about who is signed in. */
export interface Session {
  id: number;
  email: string;
  role: Role;
  fullName: string | null;
  organisation: string | null;
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  new: "New",
  in_review: "Being reviewed",
  quoted: "Quote sent",
  won: "Ordered",
  lost: "Closed",
};

/** A page of results, whatever is being paged. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
