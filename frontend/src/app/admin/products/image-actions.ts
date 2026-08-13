"use server";

/**
 * Uploading, ordering and removing product photographs.
 *
 * The web tier moves bytes and nothing else. It does not inspect the file, does
 * not name the object, does not hold storage credentials and never learns where
 * the bucket is: the multipart body is forwarded to the API, which decides what
 * the bytes really are and where they go.
 *
 * That matters because file upload is the classic path from "user input" to
 * "code on the server". Keeping the decision in one place, behind one set of
 * credentials, means there is one thing to get right rather than two.
 */

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { products } from "@/lib/api/resources";
import { requireAdmin } from "@/lib/auth/session";

export type ImageState = { error?: string; ok?: string } | undefined;

/** Everything an upload touches, in one place, so nothing is forgotten. */
function refresh(sku: string, slug?: string): void {
  revalidatePath(`/admin/products/${sku}`);
  if (slug) revalidatePath(`/product/${slug}`);
}

export async function uploadImages(_prev: ImageState, form: FormData): Promise<ImageState> {
  await requireAdmin();

  const sku = String(form.get("sku") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo first." };

  // Rebuilt rather than forwarded: the incoming form carries the SKU and slug
  // as fields, and the API's validator refuses anything it did not ask for.
  const upload = new FormData();
  for (const file of files) upload.append("photos", file, file.name);

  try {
    const result = await products.uploadImages(sku, upload);
    refresh(sku, slug || undefined);

    if (result.errors.length && result.added === 0) return { error: result.errors.join(" ") };
    if (result.errors.length) {
      return { ok: `${result.added} added.`, error: result.errors.join(" ") };
    }
    return { ok: `${result.added} photo${result.added === 1 ? "" : "s"} added.` };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "The upload did not go through. Try again in a moment." };
  }
}

export async function removeImage(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  await products.removeImage(id);
  refresh(String(form.get("sku") ?? ""), String(form.get("slug") ?? "") || undefined);
}

export async function reorderImage(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  await products.moveImage(id, form.get("direction") === "up" ? "up" : "down");
  refresh(String(form.get("sku") ?? ""), String(form.get("slug") ?? "") || undefined);
}

/**
 * The caption, which is also what a screen reader says and what shows if the
 * photograph fails to load. Worth asking for, so it is a field rather than
 * something generated from the file name.
 */
export async function describeImage(form: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;

  await products.setImageAlt(id, String(form.get("alt") ?? ""));
  refresh(String(form.get("sku") ?? ""), String(form.get("slug") ?? "") || undefined);
}
