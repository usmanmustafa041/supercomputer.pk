import "server-only";

import { one, query, scalar } from "./client";
import { ensureReady } from "./init";
import type { InvoiceRow, InvoiceStatus, Page, QuoteLine, QuoteRow } from "./types";

export function invoiceTotal(invoice: Pick<InvoiceRow, "subtotal_pkr" | "tax_rate" | "discount_pkr">): number {
  const taxable = Math.max(0, Number(invoice.subtotal_pkr) - Number(invoice.discount_pkr));
  return taxable + taxable * (Number(invoice.tax_rate) / 100);
}

export async function listInvoices(opts: { status?: string; page?: number; perPage?: number } = {}): Promise<Page<InvoiceRow>> {
  await ensureReady();
  const params: unknown[] = [];
  const clause = opts.status ? `WHERE status = $${params.push(opts.status)}` : "";
  const total = Number(await scalar<string>(`SELECT count(*) FROM invoices ${clause}`, params));
  const perPage = Math.min(Math.max(opts.perPage ?? 25, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const items = await query<InvoiceRow>(
    `SELECT * FROM invoices ${clause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, (page - 1) * perPage],
  );
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getInvoice(number: string): Promise<InvoiceRow | null> {
  await ensureReady();
  return one<InvoiceRow>("SELECT * FROM invoices WHERE invoice_number = $1", [number]);
}

export async function createInvoiceFromQuote(quote: QuoteRow): Promise<InvoiceRow> {
  await ensureReady();
  const due = new Date();
  due.setDate(due.getDate() + 14);
  const number = await scalar<string>("SELECT next_document_number('invoice','INV')");
  const rows = await query<InvoiceRow>(
    `INSERT INTO invoices
      (invoice_number, quote_id, customer_id, customer_name, customer_email, organisation, billing_address,
       lines, subtotal_pkr, tax_rate, discount_pkr, due_date, payment_terms, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [number, quote.id, quote.customer_id, quote.contact_name, quote.contact_email, quote.organisation,
     [quote.organisation, quote.city].filter(Boolean).join(", "), JSON.stringify(quote.lines),
     quote.subtotal_pkr, quote.tax_rate, quote.discount_pkr, due.toISOString().slice(0, 10),
     quote.payment_terms ?? "Payment due within 14 days", `Created from ${quote.reference}`],
  );
  return rows[0];
}

export interface InvoicePatch {
  customer_name: string;
  customer_email?: string | null;
  organisation?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  lines: QuoteLine[];
  subtotal_pkr: number;
  tax_rate: number;
  discount_pkr: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  customer_ntn?: string | null;
  customer_strn?: string | null;
  cancellation_note?: string | null;
  sent_at?: Date | null;
}

export async function updateInvoice(number: string, patch: InvoicePatch): Promise<void> {
  await ensureReady();
  await query(
    `UPDATE invoices SET customer_name=$1, customer_email=$2, organisation=$3, billing_address=$4,
      lines=$5, subtotal_pkr=$6, tax_rate=$7, discount_pkr=$8, status=$9, issue_date=$10,
      due_date=$11, payment_terms=$12, notes=$13, shipping_address=$14, customer_ntn=$15,
      customer_strn=$16, cancellation_note=$17, sent_at=COALESCE($18,sent_at), updated_at=now() WHERE invoice_number=$19`,
    [patch.customer_name, patch.customer_email, patch.organisation, patch.billing_address,
     JSON.stringify(patch.lines), patch.subtotal_pkr, patch.tax_rate, patch.discount_pkr,
     patch.status, patch.issue_date, patch.due_date, patch.payment_terms, patch.notes,
     patch.shipping_address, patch.customer_ntn, patch.customer_strn, patch.cancellation_note, patch.sent_at ?? null, number],
  );
}

export async function deleteInvoice(number: string): Promise<void> {
  await ensureReady();
  await query("DELETE FROM invoices WHERE invoice_number = $1", [number]);
}
