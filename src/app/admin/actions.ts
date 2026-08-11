"use server";

/**
 * Everything an administrator can change.
 *
 * These are Server Actions: the browser posts the form straight to a function
 * that runs on the server. There is no hand-written endpoint in between and no
 * fetch call in the page, so a field added to the form and to the function is
 * wired up with nothing left to forget.
 *
 * Each one calls requireAdmin() before it touches anything. The API checks the
 * token again on its side. Two checks is not paranoia: the layout check governs
 * what is drawn, this one governs what is done.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api/server";
import { requireAdmin } from "@/lib/auth/session";
import type { Product } from "@/lib/api/types";

export type ActionState = { error?: string; ok?: string } | undefined;

/** Empty string means "left blank", which is not the same as zero. */
function num(form: FormData, key: string): number | undefined {
  const raw = String(form.get(key) ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function text(form: FormData, key: string): string | undefined {
  const raw = String(form.get(key) ?? "").trim();
  return raw === "" ? undefined : raw;
}

function list(form: FormData, key: string): string[] {
  return String(form.get(key) ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The specs box is free-form JSON, because specs differ per category. */
function specs(form: FormData): { value?: Record<string, unknown>; error?: string } {
  const raw = String(form.get("specs") ?? "").trim();
  if (raw === "") return { value: {} };
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "Specifications must be a JSON object, for example {\"vram_gb\": 80}." };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: "Specifications are not valid JSON. Check the brackets and commas." };
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const sku = String(form.get("sku") ?? "").trim().toUpperCase();
  const brand = String(form.get("brand") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  if (!sku || !brand || !model) return { error: "SKU, brand and model are all required." };

  const parsedSpecs = specs(form);
  if (parsedSpecs.error) return { error: parsedSpecs.error };

  const existingSku = text(form, "existing_sku");

  const body = {
    slug: text(form, "slug") ?? slugify(`${brand}-${model}-${sku}`),
    kind: String(form.get("kind") ?? "gpu"),
    brand,
    model,
    mpn: text(form, "mpn") ?? null,
    family: text(form, "family") ?? "",
    condition: String(form.get("condition") ?? "new"),
    segment: String(form.get("segment") ?? "datacenter"),
    price_pkr: num(form, "price_pkr") ?? 0,
    price_on_request: form.get("price_on_request") === "on",
    stock_qty: num(form, "stock_qty") ?? 0,
    lead_days: num(form, "lead_days") ?? 0,
    indent_only: form.get("indent_only") === "on",
    warranty_months: num(form, "warranty_months") ?? 12,
    release_year: num(form, "release_year") ?? new Date().getFullYear(),
    search_key: `${brand} ${model} ${sku}`.toLowerCase(),
    highlights: list(form, "highlights"),
    tags: list(form, "tags"),
    specs: parsedSpecs.value!,
    is_active: form.get("is_active") === "on",
  };

  try {
    if (existingSku) {
      await api<Product>(`/api/admin/products/${encodeURIComponent(existingSku)}`, {
        method: "PATCH",
        body,
        auth: true,
      });
    } else {
      await api<Product>("/api/admin/products", { method: "POST", body: { sku, ...body }, auth: true });
    }
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not save. The API did not answer." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  redirect(`/admin/products?saved=${encodeURIComponent(existingSku ?? sku)}`);
}

export async function retireProduct(form: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(form.get("sku"));
  const hard = form.get("hard") === "on";
  await api(`/api/admin/products/${encodeURIComponent(sku)}?hard=${hard}`, {
    method: "DELETE",
    auth: true,
  });
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
}

export async function restoreProduct(form: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(form.get("sku"));
  await api(`/api/admin/products/${encodeURIComponent(sku)}/restore`, { method: "POST", auth: true });
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
}

/** Fast edit from the list, so restocking does not mean opening the editor. */
export async function setStock(form: FormData): Promise<void> {
  await requireAdmin();
  const sku = String(form.get("sku"));
  const qty = Math.max(0, Number(form.get("stock_qty") ?? 0) || 0);
  await api(`/api/admin/products/${encodeURIComponent(sku)}`, {
    method: "PATCH",
    body: { stock_qty: qty },
    auth: true,
  });
  revalidatePath("/admin/products");
}

export async function setQuoteStatus(form: FormData): Promise<void> {
  await requireAdmin();
  const reference = String(form.get("reference"));
  const body: Record<string, unknown> = {};
  const status = text(form, "status");
  const note = form.get("internal_note");
  if (status) body.status = status;
  if (note !== null) body.internal_note = String(note);

  await api(`/api/admin/quotes/${encodeURIComponent(reference)}`, {
    method: "PATCH",
    body,
    auth: true,
  });
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${reference}`);
}
