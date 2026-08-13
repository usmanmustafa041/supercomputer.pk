"use server";

/**
 * Everything an administrator can change.
 *
 * These are Server Actions: the form posts straight to a function that runs on
 * the server, which calls the API. No fetch in the page, no endpoint to write,
 * and no credentials anywhere near the browser.
 *
 * Every one calls requireAdmin() first, and that is the weaker of two checks.
 * A Server Action compiles to a POST endpoint that anyone who can find its id
 * may call, whether or not the interface ever drew a button for it, so this
 * decides what is worth attempting and the API decides what actually happens.
 * The API checks the role again on every write.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { products, quotes } from "@/lib/api/resources";
import type { QuoteStatus } from "@/lib/api/types";
import { requireAdmin } from "@/lib/auth/session";
import { specsFromForm } from "@/lib/admin/spec-parse";
import type { Kind } from "@supercomputers/shared";

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

/** Turns an API failure into something worth showing on a form. */
function explain(e: unknown, fallback: string): ActionState {
  if (e instanceof ApiError) return { error: e.message };
  return { error: fallback };
}

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const sku = String(form.get("sku") ?? "").trim().toUpperCase();
  const brand = String(form.get("brand") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  if (!sku || !brand || !model) return { error: "SKU, brand and model are all required." };

  const kind = String(form.get("kind") ?? "gpu") as Kind;
  const existingSku = text(form, "existing_sku");

  const body = {
    slug: text(form, "slug"),
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
    highlights: lines(form, "highlights"),
    tags: lines(form, "tags"),
    // Built from the category's own fields, not typed in as JSON.
    specs: specsFromForm(kind, form),
    is_active: form.get("is_active") === "on",
  };

  try {
    if (existingSku) await products.update(existingSku, body);
    else await products.create({ sku, ...body });
  } catch (e) {
    return explain(e, "Could not save. Please try again.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  // A new product goes to its own page rather than back to the list, because
  // photographs can only be attached once the SKU exists.
  if (!existingSku) redirect(`/admin/products/${encodeURIComponent(sku)}?created=1`);
  redirect(`/admin/products?saved=${encodeURIComponent(existingSku)}`);
}

export async function retire(form: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(form.get("sku"));
  const hard = form.get("hard") === "on";

  // The API takes the image rows with the product and sweeps up any objects
  // nothing points at any more. That cleanup belongs next to the storage
  // credentials, which the web tier does not have.
  await products.remove(sku, hard);

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  if (hard) redirect("/admin/products");
}

export async function restore(form: FormData): Promise<void> {
  await requireAdmin();
  await products.restore(String(form.get("sku")));
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
}

/** Fast edit from the list, so restocking does not mean opening the editor. */
export async function setStock(form: FormData): Promise<void> {
  await requireAdmin();
  const qty = Math.max(0, Number(form.get("stock_qty") ?? 0) || 0);
  await products.setStock(String(form.get("sku")), qty);
  revalidatePath("/admin/products");
}

export async function setQuoteStatus(form: FormData): Promise<void> {
  await requireAdmin();
  const reference = String(form.get("reference"));
  await quotes.update(reference, {
    status: (text(form, "status") as QuoteStatus) ?? undefined,
    internal_note: String(form.get("internal_note") ?? ""),
  });
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${reference}`);
}
