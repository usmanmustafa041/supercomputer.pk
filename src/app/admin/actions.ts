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
import { updateQuote } from "@/lib/db/quotes";
import { specsFromForm } from "@/lib/admin/spec-parse";
import type { Kind } from "@/lib/catalog/types";
import type { QuoteStatus } from "@/lib/db/types";

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

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const sku = String(form.get("sku") ?? "").trim().toUpperCase();
  const brand = String(form.get("brand") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  if (!sku || !brand || !model) return { error: "SKU, brand and model are all required." };

  const kind = String(form.get("kind") ?? "gpu") as Kind;
  const existingSku = text(form, "existing_sku");

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
  redirect(`/admin/products?saved=${encodeURIComponent(existingSku ?? sku)}`);
}

export async function retire(form: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(form.get("sku"));
  if (form.get("hard") === "on") await deleteProduct(sku);
  else await retireProduct(sku);
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  if (form.get("hard") === "on") redirect("/admin/products");
}

export async function restore(form: FormData): Promise<void> {
  await requireAdmin();
  await restoreProduct(String(form.get("sku")));
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
}

/** Fast edit from the list, so restocking does not mean opening the editor. */
export async function setStock(form: FormData): Promise<void> {
  await requireAdmin();
  const qty = Math.max(0, Number(form.get("stock_qty") ?? 0) || 0);
  await updateProduct(String(form.get("sku")), { stock_qty: qty });
  revalidatePath("/admin/products");
}

export async function setQuoteStatus(form: FormData): Promise<void> {
  await requireAdmin();
  const reference = String(form.get("reference"));
  await updateQuote(reference, {
    status: (text(form, "status") as QuoteStatus) ?? undefined,
    internal_note: String(form.get("internal_note") ?? ""),
  });
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${reference}`);
}
