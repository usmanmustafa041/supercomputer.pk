"use server";

/**
 * Managing the pre-built configurations.
 *
 * Note what is not here: no way to type a parts list in. Family keys are
 * internal identifiers and asking anyone to enter them by hand is the JSON box
 * problem again in a new place. A configuration is captured from the
 * configurator, where it has already been checked, and everything here is
 * presentation: the name, the description, the order, whether it is offered.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { presets } from "@/lib/api/resources";
import type { PresetPick, PresetTarget } from "@/lib/api/types";
import { requireAdmin } from "@/lib/auth/session";

export type PresetState = { error?: string; ok?: string } | undefined;

const TARGETS: PresetTarget[] = ["desk", "rack", "cluster"];

function target(form: FormData): PresetTarget {
  const raw = String(form.get("target") ?? "desk") as PresetTarget;
  return TARGETS.includes(raw) ? raw : "desk";
}

function refresh(): void {
  revalidatePath("/admin/presets");
  revalidatePath("/configure");
}

/** Everything that changes on the edit screen except the parts themselves. */
export async function savePreset(_prev: PresetState, form: FormData): Promise<PresetState> {
  await requireAdmin();

  const slug = String(form.get("slug") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Give it a name." };

  try {
    await presets.update(slug, {
      name,
      role: String(form.get("role") ?? "").trim(),
      blurb: String(form.get("blurb") ?? "").trim(),
      target: target(form),
      is_active: form.get("is_active") === "on",
    });
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not save. Please try again." };
  }

  refresh();
  redirect(`/admin/presets?saved=${encodeURIComponent(slug)}`);
}

/**
 * Stores the configuration currently open in the configurator.
 *
 * Parts arrive as family keys with the exact model recorded alongside, so the
 * preset survives the catalogue being regenerated but still resolves to the
 * variant that was actually chosen rather than the cheapest thing sharing its
 * family name.
 */
export async function capturePreset(_prev: PresetState, form: FormData): Promise<PresetState> {
  await requireAdmin();

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Give it a name before saving." };

  let picks: PresetPick[];
  try {
    const parsed = JSON.parse(String(form.get("picks") ?? "[]"));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "There is nothing configured to save." };
    }
    picks = parsed
      .filter((p): p is PresetPick => typeof p?.family === "string" && p.family !== "")
      .map((p) => ({
        family: p.family,
        qty: Math.max(1, Math.round(Number(p.qty)) || 1),
        variant: typeof p.variant === "string" && p.variant ? p.variant.slice(0, 120) : undefined,
      }));
  } catch {
    return { error: "Could not read the configuration. Reload the page and try again." };
  }
  if (picks.length === 0) return { error: "There is nothing configured to save." };

  try {
    await presets.create({
      name,
      role: String(form.get("role") ?? "").trim(),
      blurb: String(form.get("blurb") ?? "").trim(),
      target: target(form),
      picks,
      is_active: true,
    });
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not save. Please try again." };
  }

  refresh();
  return { ok: `Saved as ${name}. It is now offered in the configurator.` };
}

/** Quantity and removal, the two edits that do not need the configurator. */
export async function editPick(form: FormData): Promise<void> {
  await requireAdmin();

  const slug = String(form.get("slug") ?? "");
  const index = Number(form.get("index"));
  if (!Number.isInteger(index) || index < 0) return;

  const preset = await presets.bySlug(slug);
  if (index >= preset.picks.length) return;

  const picks = [...preset.picks];
  if (form.get("remove") === "on") {
    picks.splice(index, 1);
  } else {
    picks[index] = { ...picks[index], qty: Math.max(1, Math.round(Number(form.get("qty"))) || 1) };
  }

  await presets.update(slug, { picks });
  revalidatePath(`/admin/presets/${slug}`);
  revalidatePath("/configure");
}

export async function reorderPreset(form: FormData): Promise<void> {
  await requireAdmin();
  await presets.move(String(form.get("slug") ?? ""), form.get("direction") === "up" ? "up" : "down");
  refresh();
}

export async function togglePreset(form: FormData): Promise<void> {
  await requireAdmin();
  await presets.update(String(form.get("slug") ?? ""), { is_active: form.get("active") === "on" });
  refresh();
}

export async function removePreset(form: FormData): Promise<void> {
  await requireAdmin();
  await presets.remove(String(form.get("slug") ?? ""));
  refresh();
  redirect("/admin/presets");
}
