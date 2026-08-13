/**
 * What a row looks like coming back from Postgres.
 *
 * These are the only shapes the rest of the app deals in. Because the queries
 * and the pages are now the same TypeScript project, there is nothing to keep
 * in sync by hand: change a column here and every page that reads it stops
 * compiling until it is updated.
 */

export type Role = "admin" | "customer";
export type QuoteStatus = "new" | "reviewing" | "quote_sent" | "accepted" | "stock_reserved" | "invoice_issued" | "partially_paid" | "paid" | "preparing" | "delivered" | "cancelled" | "lost" | "in_review" | "quoted" | "won";
export type InvoiceStatus = "draft" | "issued" | "sent" | "partially_paid" | "paid" | "preparing" | "delivered" | "cancelled" | "void";

export interface UserRow {
  id: number;
  email: string;
  full_name: string | null;
  organisation: string | null;
  phone: string | null;
  role: Role;
  is_active: boolean;
  failed_login_count?: number;
  locked_until?: Date | null;
  totp_enabled?: boolean;
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
  media: import("@/lib/catalog/types").ProductMedia[];
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
  unit_price_pkr?: number;
  slug?: string;
  family?: string;
  warranty_months?: number;
  availability?: { in_house: number; lead_days: number; indent_only: boolean };
  specs?: Record<string, unknown>;
}

export interface QuoteRow {
  id: number;
  reference: string;
  user_id: number | null;
  customer_id: number | null;
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
  subtotal_pkr: number;
  tax_rate: number;
  discount_pkr: number;
  valid_until: string | null;
  payment_terms: string | null;
  revision_number: number;
  billing_address: Record<string, string> | null;
  shipping_address: Record<string, string> | null;
  tax_name: string;
  customer_ntn: string | null;
  customer_strn: string | null;
  sent_at: Date | null;
  opened_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceRow {
  id: number;
  invoice_number: string;
  quote_id: number | null;
  customer_id: number | null;
  customer_name: string;
  customer_email: string | null;
  organisation: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  lines: QuoteLine[];
  subtotal_pkr: number;
  tax_rate: number;
  discount_pkr: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  tax_name: string;
  customer_ntn: string | null;
  customer_strn: string | null;
  cancellation_note: string | null;
  sent_at: Date | null;
  opened_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Everything the browser is allowed to know about who is signed in. */
export interface Session {
  id: number;
  email: string;
  role: Role;
  fullName: string | null;
  organisation: string | null;
  totpEnabled: boolean;
}

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  quote_sent: "Quote sent",
  accepted: "Accepted",
  stock_reserved: "Stock reserved",
  invoice_issued: "Invoice issued",
  partially_paid: "Partially paid",
  paid: "Paid",
  preparing: "Preparing",
  delivered: "Delivered",
  cancelled: "Cancelled",
  lost: "Closed",
  in_review: "Reviewing (legacy)",
  quoted: "Quote sent (legacy)",
  won: "Accepted (legacy)",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  sent: "Sent",
  partially_paid: "Partially paid",
  paid: "Paid",
  preparing: "Preparing",
  delivered: "Delivered",
  cancelled: "Cancelled",
  void: "Void",
};

export interface CustomerRow {
  id: number;
  customer_number: string;
  organisation: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  ntn: string | null;
  strn: string | null;
  credit_limit_pkr: number;
  payment_terms: string | null;
  internal_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentRow {
  id: number;
  invoice_id: number;
  payment_reference: string;
  amount_pkr: number;
  payment_method: string;
  transaction_reference: string | null;
  received_at: Date;
  note: string | null;
  created_at: Date;
}

/** A page of results, whatever is being paged. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
