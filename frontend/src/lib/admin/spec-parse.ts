/**
 * Turning form fields back into typed specification values.
 *
 * The form posts everything as strings. The compatibility engine expects
 * numbers to be numbers and lists to be lists, so this walks the field
 * definitions for the chosen category and converts each value the way that
 * field says it should be converted. Nothing is guessed from the string itself.
 */

import type { Kind } from "@supercomputers/shared";
import { SPEC_FIELDS } from "./spec-fields";

/** Form inputs are named "spec.vramGb", so they cannot collide with real columns. */
export const SPEC_PREFIX = "spec.";

/** Slots are typed as four numbers a line: generation, size, lanes, positions. */
function parseSlots(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [gen, width, lanes, spacing] = line.split(/[,\s]+/).map((n) => Number(n) || 0);
      return { gen, width, lanes: lanes || width, spacing: spacing || 1 };
    });
}

export function specsFromForm(kind: Kind, form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const field of SPEC_FIELDS[kind] ?? []) {
    const name = SPEC_PREFIX + field.key;

    switch (field.type) {
      case "boolean":
        // An unticked checkbox posts nothing at all, which is the "false".
        out[field.key] = form.get(name) === "on";
        break;

      case "number": {
        const raw = String(form.get(name) ?? "").trim();
        if (raw === "") break; // left blank means "we do not know", not zero
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) out[field.key] = n;
        break;
      }

      case "select": {
        const raw = String(form.get(name) ?? "").trim();
        if (raw === "") break;
        // Numeric option lists (PCIe generation, phase count) stay numeric.
        out[field.key] = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
        break;
      }

      case "multi":
        out[field.key] = form.getAll(name).map(String);
        break;

      case "counts": {
        // Only cables with a count above zero are worth recording.
        const counts: Record<string, number> = {};
        for (const [value] of field.options) {
          const n = Number(form.get(`${name}.${value}`) ?? 0);
          if (Number.isFinite(n) && n > 0) counts[value] = n;
        }
        out[field.key] = counts;
        break;
      }

      case "list": {
        const raw = String(form.get(name) ?? "");
        out[field.key] =
          field.key === "pcieSlots"
            ? parseSlots(raw)
            : raw
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
        break;
      }

      case "text": {
        const raw = String(form.get(name) ?? "").trim();
        if (raw !== "") out[field.key] = raw;
        break;
      }
    }
  }

  // Anything the catalog already held that this form does not ask about is
  // carried through untouched, so editing a product cannot quietly drop data
  // the compatibility engine still reads.
  const carried = String(form.get("spec_extra") ?? "").trim();
  if (carried) {
    try {
      const extra = JSON.parse(carried) as Record<string, unknown>;
      for (const [k, v] of Object.entries(extra)) if (!(k in out)) out[k] = v;
    } catch {
      /* the form writes this field, so a parse failure means it was tampered with */
    }
  }

  return out;
}
