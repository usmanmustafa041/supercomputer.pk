"use server";

/**
 * Everything an administrator can change.
 *
 * These are Server Actions: the form posts straight to a function that runs on
 * the server, which writes to Postgres. No endpoint in between, no fetch call
 * in the page, and no second copy of the types.
 *
 * Every one calls requireAdmin() first. The layout already decides what gets
 * drawn; this decides what actually happens, which is the check that matters.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  createProduct,
  deleteProduct,
  getProductBySku,
  restoreProduct,
  retireProduct,
  updateProduct,
} from "@/lib/db/products";
import { getQuote, updateQuote } from "@/lib/db/quotes";
import { createInvoiceFromQuote, getInvoice, updateInvoice } from "@/lib/db/invoices";
import { specsFromForm } from "@/lib/admin/spec-parse";
import type { Kind, ProductMedia, ProductMediaRole } from "@/lib/catalog/types";
import type { InvoiceStatus, QuoteStatus } from "@/lib/db/types";
import { audit } from "@/lib/auth/audit";
import { createQuoteRevision } from "@/lib/db/quotes";
import { fulfilInvoiceStock, MOVEMENT_TYPES, recordMovement, releaseQuoteStock, reserveQuoteStock, setOnHandStock, type MovementType } from "@/lib/db/inventory";
import { recordPayment } from "@/lib/db/payments";
import { updateCustomer } from "@/lib/db/customers";
import { quotePdf, invoicePdf } from "@/lib/pdf/commercial";
import { sendEmail } from "@/lib/email";
import { upsertTemplate } from "@/lib/db/templates";
import { openTrackingUrl } from "@/lib/tracking";

export type ActionState = { error?: string; ok?: string } | undefined;

/** Blank is "not given", which is not the same as zero. */
function num(form: FormData, key: string, fallback: number): number {
  const raw = String(form.get(key) ?? "").trim();
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function text(form: FormData, key: string): string | undefined {
  const raw = String(form.get(key) ?? "").trim();
  return raw === "" ? undefined : raw;
}

function lines(form: FormData, key: string): string[] {
  return String(form.get(key) ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const MEDIA_ROLES = new Set<ProductMediaRole>(["main", "gallery", "serial", "condition", "packaging", "inspection"]);

function parseProductMedia(form: FormData): ProductMedia[] {
  const base = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return lines(form, "media").map((line, index) => {
    const [rawRole, rawUrl, ...altParts] = line.split("|").map((part) => part.trim());
    const role = rawRole as ProductMediaRole;
    const alt = altParts.join(" | ");
    if (!MEDIA_ROLES.has(role) || !rawUrl || !alt) {
      throw new Error(`Media line ${index + 1} must be: role | URL | alt text.`);
    }
    let url: URL;
    try { url = new URL(rawUrl); } catch { throw new Error(`Media line ${index + 1} has an invalid URL.`); }
    if (!/^https?:$/.test(url.protocol) || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
      throw new Error(`Media line ${index + 1} must use ${process.env.NODE_ENV === "production" ? "HTTPS" : "HTTP or HTTPS"}.`);
    }
    if (base && !rawUrl.startsWith(`${base}/`)) throw new Error(`Media line ${index + 1} must use ${base}.`);
    const type = role === "inspection" || /\.(mp4|webm|mov)(?:\?|$)/i.test(rawUrl) ? "video" : "image";
    return { role, url: rawUrl, alt, type };
  });
}

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const sku = String(form.get("sku") ?? "").trim().toUpperCase();
  const brand = String(form.get("brand") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  if (!sku || !brand || !model) return { error: "SKU, brand and model are all required." };

  const kind = String(form.get("kind") ?? "gpu") as Kind;
  const existingSku = text(form, "existing_sku");

  let media: ProductMedia[];
  try { media = parseProductMedia(form); } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid product media." };
  }

  const body = {
    slug: text(form, "slug") ?? slugify(`${brand}-${model}-${sku}`),
    kind,
    brand,
    model,
    mpn: text(form, "mpn") ?? null,
    family: text(form, "family") ?? "",
    condition: String(form.get("condition") ?? "new"),
    segment: String(form.get("segment") ?? "datacenter"),
    price_pkr: num(form, "price_pkr", 0),
    price_on_request: form.get("price_on_request") === "on",
    stock_qty: num(form, "stock_qty", 0),
    lead_days: num(form, "lead_days", 0),
    indent_only: form.get("indent_only") === "on",
    warranty_months: num(form, "warranty_months", 12),
    release_year: num(form, "release_year", new Date().getFullYear()),
    search_key: `${brand} ${model} ${sku}`.toLowerCase(),
    highlights: lines(form, "highlights"),
    tags: lines(form, "tags"),
    media,
    // Built from the category's own fields, not typed in as JSON.
    specs: specsFromForm(kind, form),
    is_active: form.get("is_active") === "on",
  };

  try {
    if (existingSku) {
      const updated = await updateProduct(existingSku, body);
      if (!updated) return { error: `No product with SKU ${existingSku}.` };
    } else {
      if (await getProductBySku(sku)) return { error: `A product with SKU ${sku} already exists.` };
      await createProduct({ sku, ...body });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/slug/.test(message)) return { error: "That web address is already used by another product." };
    return { error: "Could not save. Please try again." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  await audit(admin.id, existingSku ? "product.updated" : "product.created", existingSku ?? sku);
  redirect(`/admin/products?saved=${encodeURIComponent(existingSku ?? sku)}`);
}

export async function retire(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const sku = String(form.get("sku"));
  if (form.get("hard") === "on") await deleteProduct(sku);
  else await retireProduct(sku);
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  await audit(admin.id, form.get("hard") === "on" ? "product.deleted" : "product.retired", sku);
  if (form.get("hard") === "on") redirect("/admin/products");
}

export async function restore(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const sku = String(form.get("sku"));
  await restoreProduct(sku);
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  await audit(admin.id, "product.restored", sku);
}

/** Fast edit from the list, so restocking does not mean opening the editor. */
export async function setStock(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const qty = Math.max(0, Number(form.get("stock_qty") ?? 0) || 0);
  await setOnHandStock(String(form.get("sku")), qty, admin.id);
  revalidatePath("/admin/products");
  await audit(admin.id, "product.stock_changed", String(form.get("sku")), { quantity: qty });
}

export async function setQuoteStatus(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reference = String(form.get("reference"));
  const quote = await getQuote(reference);
  const nextStatus = (text(form, "status") as QuoteStatus) ?? undefined;
  if (quote && (nextStatus === "cancelled" || nextStatus === "lost") && quote.status !== nextStatus) await releaseQuoteStock(quote.id, admin.id);
  await updateQuote(reference, {
    status: nextStatus,
    internal_note: String(form.get("internal_note") ?? ""),
  });
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${reference}`);
  await audit(admin.id, "quote.status_changed", reference, { status: text(form, "status") });
}

export async function reserveQuote(form:FormData):Promise<void>{const admin=await requireAdmin();const reference=String(form.get("reference"));const quote=await getQuote(reference);if(!quote)return;await reserveQuoteStock(quote.id,quote.lines,admin.id);await updateQuote(reference,{status:"stock_reserved"});revalidatePath(`/admin/quotes/${reference}`);revalidatePath("/admin/inventory");await audit(admin.id,"quote.stock_reserved",reference);}

export async function reviseQuote(form:FormData):Promise<void>{const admin=await requireAdmin();const reference=String(form.get("reference"));await createQuoteRevision(reference,admin.id,text(form,"revision_note"));revalidatePath(`/admin/quotes/${reference}`);await audit(admin.id,"quote.revised",reference);}

export async function emailQuote(form:FormData):Promise<void>{const admin=await requireAdmin();const reference=String(form.get("reference"));const quote=await getQuote(reference);if(!quote)return;const pdf=await quotePdf(quote);const tracking=openTrackingUrl("quote",quote.reference);const ok=await sendEmail(quote.contact_email,`Quotation ${quote.reference}`,`Please find quotation ${quote.reference} attached.`,[{filename:`${quote.reference}.pdf`,contentBase64:Buffer.from(pdf).toString("base64"),contentType:"application/pdf"}],`<p>Please find quotation <strong>${quote.reference}</strong> attached.</p><img src="${tracking}" width="1" height="1" alt="">`);if(ok)await updateQuote(reference,{status:"quote_sent",sent_at:new Date()});revalidatePath(`/admin/quotes/${reference}`);await audit(admin.id,"quote.emailed",reference,{delivered:ok});}

export async function addInventoryMovement(form:FormData):Promise<void>{const admin=await requireAdmin();const type=String(form.get("movement_type")) as MovementType;if(!MOVEMENT_TYPES.includes(type))return;await recordMovement({sku:String(form.get("sku")),type,quantityDelta:num(form,"quantity_delta",0),reservedDelta:num(form,"reserved_delta",0),reference:text(form,"reference"),note:text(form,"note"),actorId:admin.id});revalidatePath("/admin/inventory");revalidatePath("/admin/products");await audit(admin.id,"inventory.movement",String(form.get("sku")),{type});}

export async function addPayment(form:FormData):Promise<void>{const admin=await requireAdmin();const invoiceId=num(form,"invoice_id",0);await recordPayment({invoiceId,amount:num(form,"amount_pkr",0),method:String(form.get("payment_method")||"bank_transfer"),transactionReference:text(form,"transaction_reference"),note:text(form,"payment_note"),actorId:admin.id});const number=String(form.get("invoice_number"));revalidatePath(`/admin/invoices/${number}`);await audit(admin.id,"payment.recorded",number,{amount:num(form,"amount_pkr",0)});}

export async function emailInvoice(form:FormData):Promise<void>{const admin=await requireAdmin();const number=String(form.get("invoice_number"));const invoice=await getInvoice(number);if(!invoice?.customer_email)return;const pdf=await invoicePdf(invoice);const tracking=openTrackingUrl("invoice",number);const ok=await sendEmail(invoice.customer_email,`Invoice ${number}`,`Please find invoice ${number} attached.`,[{filename:`${number}.pdf`,contentBase64:Buffer.from(pdf).toString("base64"),contentType:"application/pdf"}],`<p>Please find invoice <strong>${number}</strong> attached.</p><img src="${tracking}" width="1" height="1" alt="">`);if(ok)await updateInvoice(number,{customer_name:invoice.customer_name,customer_email:invoice.customer_email,organisation:invoice.organisation,billing_address:invoice.billing_address,shipping_address:invoice.shipping_address,lines:invoice.lines,subtotal_pkr:invoice.subtotal_pkr,tax_rate:invoice.tax_rate,discount_pkr:invoice.discount_pkr,status:"sent",issue_date:String(invoice.issue_date).slice(0,10),due_date:invoice.due_date,payment_terms:invoice.payment_terms,notes:invoice.notes,customer_ntn:invoice.customer_ntn,customer_strn:invoice.customer_strn,cancellation_note:invoice.cancellation_note,sent_at:new Date()});revalidatePath(`/admin/invoices/${number}`);await audit(admin.id,"invoice.emailed",number,{delivered:ok});}

export async function saveCustomer(form:FormData):Promise<void>{const admin=await requireAdmin();const id=num(form,"customer_id",0);await updateCustomer(id,{display_name:String(form.get("display_name")||""),organisation:text(form,"organisation"),email:text(form,"email"),phone:text(form,"phone"),ntn:text(form,"ntn"),strn:text(form,"strn"),payment_terms:text(form,"payment_terms"),internal_notes:text(form,"internal_notes"),credit_limit_pkr:num(form,"credit_limit_pkr",0)});revalidatePath(`/admin/customers/${id}`);await audit(admin.id,"customer.updated",String(id));}

export async function saveDocumentTemplate(form:FormData):Promise<void>{const admin=await requireAdmin();const type=String(form.get("template_type")) as "quote"|"invoice";if(!["quote","invoice"].includes(type))return;let config:Record<string,unknown>;try{config=JSON.parse(String(form.get("config")||"{}"));}catch{throw new Error("Template configuration must be valid JSON.");}await upsertTemplate(type,String(form.get("name")||"Default"),config);revalidatePath("/admin/templates");await audit(admin.id,"document_template.updated",type);}

export async function saveQuoteCommercial(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reference = String(form.get("reference"));
  const quote = await getQuote(reference);
  if (!quote) return;
  const pricedLines = quote.lines.map((line, index) => ({
    ...line,
    unit_price_pkr: Math.max(0, num(form, `line_price_${index}`, Number(line.unit_price_pkr ?? 0))),
  }));
  const subtotal = pricedLines.reduce((sum, line) => sum + Number(line.qty || 1) * Number(line.unit_price_pkr || 0), 0);
  await updateQuote(reference, {
    lines: pricedLines,
    subtotal_pkr: subtotal,
    tax_rate: Math.max(0, num(form, "tax_rate", 0)),
    discount_pkr: Math.max(0, num(form, "discount_pkr", 0)),
    valid_until: text(form, "valid_until") ?? null,
    payment_terms: text(form, "payment_terms") ?? null,
    status: "quote_sent",
  });
  revalidatePath("/admin");
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${reference}`);
  await audit(admin.id, "quote.priced", reference, { subtotal });
}

export async function makeInvoiceFromQuote(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const quote = await getQuote(String(form.get("reference")));
  if (!quote) return;
  const invoice = await createInvoiceFromQuote(quote);
  await updateQuote(quote.reference, { status: "invoice_issued" });
  revalidatePath("/admin");
  revalidatePath("/admin/invoices");
  await audit(admin.id, "invoice.created", invoice.invoice_number, { quote: quote.reference });
  redirect(`/admin/invoices/${invoice.invoice_number}`);
}

export async function saveInvoice(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const number = String(form.get("invoice_number"));
  const invoice = await getInvoice(number);
  if (!invoice) return;
  const pricedLines = invoice.lines.map((line, index) => ({
    ...line,
    unit_price_pkr: Math.max(0, num(form, `line_price_${index}`, Number(line.unit_price_pkr ?? 0))),
  }));
  const subtotal = pricedLines.reduce((sum, line) => sum + Number(line.qty || 1) * Number(line.unit_price_pkr || 0), 0);
  const nextStatus = String(form.get("status") ?? "draft") as InvoiceStatus;
  if (nextStatus === "delivered" && invoice.status !== "delivered") await fulfilInvoiceStock(invoice.id, admin.id);
  await updateInvoice(number, {
    customer_name: String(form.get("customer_name") ?? "").trim(),
    customer_email: text(form, "customer_email") ?? null,
    organisation: text(form, "organisation") ?? null,
    billing_address: text(form, "billing_address") ?? null,
    shipping_address: text(form, "shipping_address") ?? null,
    lines: pricedLines,
    subtotal_pkr: subtotal,
    tax_rate: Math.max(0, num(form, "tax_rate", 0)),
    discount_pkr: Math.max(0, num(form, "discount_pkr", 0)),
    status: nextStatus,
    issue_date: String(form.get("issue_date") ?? new Date().toISOString().slice(0, 10)),
    due_date: text(form, "due_date") ?? null,
    payment_terms: text(form, "payment_terms") ?? null,
    notes: text(form, "notes") ?? null,
    customer_ntn: text(form, "customer_ntn") ?? null,
    customer_strn: text(form, "customer_strn") ?? null,
    cancellation_note: text(form, "cancellation_note") ?? null,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${number}`);
  await audit(admin.id, "invoice.updated", number, { subtotal, status: String(form.get("status") ?? "draft") });
}

export async function removeInvoice(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const number = String(form.get("invoice_number"));
  const invoice = await getInvoice(number);
  if (!invoice) return;
  const cancellationNote = text(form, "cancellation_note") ?? invoice.cancellation_note;
  if (!cancellationNote) throw new Error("A cancellation note is required.");
  await updateInvoice(number, { customer_name:invoice.customer_name, customer_email:invoice.customer_email,
    organisation:invoice.organisation, billing_address:invoice.billing_address, shipping_address:invoice.shipping_address,
    lines:invoice.lines, subtotal_pkr:invoice.subtotal_pkr, tax_rate:invoice.tax_rate, discount_pkr:invoice.discount_pkr,
    status:"cancelled", issue_date:String(invoice.issue_date).slice(0,10), due_date:invoice.due_date,
    payment_terms:invoice.payment_terms, notes:invoice.notes, customer_ntn:invoice.customer_ntn,
    customer_strn:invoice.customer_strn, cancellation_note:cancellationNote });
  revalidatePath("/admin");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${number}`);
  await audit(admin.id, "invoice.cancelled", number, { note: cancellationNote });
}
