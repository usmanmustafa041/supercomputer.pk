"use client";

import { useMemo } from "react";
import { SPEC_FIELDS, groupsFor, knownKeys, type Field } from "@/lib/admin/spec-fields";
import { SPEC_PREFIX } from "@/lib/admin/spec-parse";
import type { Kind } from "@/lib/catalog/types";

/**
 * The specification part of the product form.
 *
 * Which fields appear depends on the category chosen above, so someone adding a
 * power supply is asked for watts and cable counts, and someone adding a
 * graphics card is asked for memory and card length. Nobody has to know what
 * the underlying field is called.
 */

function labelFor(f: Field) {
  return "unit" in f && f.unit ? `${f.label} (${f.unit})` : f.label;
}

function Row({ f, value }: { f: Field; value: unknown }) {
  const name = SPEC_PREFIX + f.key;
  const id = `spec-${f.key}`;

  const hint = f.hint ? (
    <span className="text-[12px] text-ink-3 leading-snug">{f.hint}</span>
  ) : null;

  switch (f.type) {
    case "boolean":
      return (
        <label className="flex items-start gap-2.5 py-1.5 sm:col-span-2">
          <input
            type="checkbox"
            name={name}
            defaultChecked={value === true}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span className="grid gap-0.5">
            <span className="text-[13.5px]">{f.label}</span>
            {hint}
          </span>
        </label>
      );

    case "select":
      return (
        <label htmlFor={id} className="grid gap-1.5">
          <span className="t-label">{f.label}</span>
          <select id={id} name={name} defaultValue={value == null ? "" : String(value)} className="field">
            <option value="">Not set</option>
            {f.options.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {hint}
        </label>
      );

    case "multi": {
      const chosen = new Set((Array.isArray(value) ? value : []).map(String));
      return (
        <fieldset className="grid gap-1.5 sm:col-span-2">
          <legend className="t-label mb-1">{f.label}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {f.options.map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" name={name} value={v} defaultChecked={chosen.has(v)} className="h-4 w-4" />
                {l}
              </label>
            ))}
          </div>
          {hint}
        </fieldset>
      );
    }

    case "counts": {
      const counts = (value ?? {}) as Record<string, number>;
      return (
        <fieldset className="grid gap-2 sm:col-span-2">
          <legend className="t-label mb-1">{f.label}</legend>
          {hint}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
            {f.options.map(([v, l]) => (
              <label key={v} className="grid gap-1">
                <span className="text-[12px] text-ink-2 leading-snug">{l}</span>
                <input
                  type="number"
                  min={0}
                  name={`${name}.${v}`}
                  defaultValue={counts[v] ?? 0}
                  className="field h-9"
                />
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    case "list": {
      // Expansion slots are objects; everything else is plain lines of text.
      const asText = Array.isArray(value)
        ? value
            .map((v) =>
              v && typeof v === "object"
                ? [
                    (v as Record<string, number>).gen,
                    (v as Record<string, number>).width,
                    (v as Record<string, number>).lanes,
                    (v as Record<string, number>).spacing,
                  ].join(", ")
                : String(v),
            )
            .join("\n")
        : "";
      return (
        <label htmlFor={id} className="grid gap-1.5 sm:col-span-2">
          <span className="t-label">{f.label}</span>
          <textarea
            id={id}
            name={name}
            rows={4}
            defaultValue={asText}
            className="field h-auto py-2 leading-relaxed"
          />
          {hint}
        </label>
      );
    }

    case "number":
      return (
        <label htmlFor={id} className="grid gap-1.5">
          <span className="t-label">{labelFor(f)}</span>
          <input
            id={id}
            type="number"
            inputMode="decimal"
            name={name}
            min={f.min}
            max={f.max}
            step={f.step ?? 1}
            defaultValue={typeof value === "number" ? value : ""}
            className="field"
          />
          {hint}
        </label>
      );

    default:
      return (
        <label htmlFor={id} className="grid gap-1.5">
          <span className="t-label">{f.label}</span>
          <input
            id={id}
            name={name}
            defaultValue={typeof value === "string" ? value : ""}
            placeholder={f.placeholder}
            className="field"
          />
          {hint}
        </label>
      );
  }
}

export default function SpecFields({
  kind,
  specs,
}: {
  kind: Kind;
  specs: Record<string, unknown>;
}) {
  const fields = SPEC_FIELDS[kind] ?? [];
  const groups = groupsFor(kind);

  // Anything already stored that this category does not ask about rides along
  // in a hidden field, so editing a product cannot quietly drop figures the
  // compatibility checks still read.
  const extra = useMemo(() => {
    const known = knownKeys(kind);
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(specs)) if (!known.has(k)) rest[k] = v;
    return rest;
  }, [kind, specs]);

  const extraCount = Object.keys(extra).length;

  return (
    <>
      <input type="hidden" name="spec_extra" value={JSON.stringify(extra)} />

      {groups.map((g) => (
        <fieldset key={g} className="grid gap-4 pt-2">
          <legend className="text-[13px] font-medium text-ink border-b border-[var(--line)] pb-1.5 w-full">
            {g}
          </legend>
          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
            {fields
              .filter((f) => (f.group ?? "Details") === g)
              .map((f) => (
                <Row key={f.key} f={f} value={specs[f.key]} />
              ))}
          </div>
        </fieldset>
      ))}

      {extraCount > 0 && (
        <details className="text-[13px] mt-1">
          <summary className="cursor-pointer text-ink-2 hover:text-ink">
            {extraCount} other {extraCount === 1 ? "figure" : "figures"} stored for this product
          </summary>
          <p className="text-[12px] text-ink-3 mt-2 mb-2 leading-relaxed">
            These came with the product and are kept as they are. They are not shown as fields because this
            category does not normally use them.
          </p>
          <pre className="t-data text-[11px] bg-[var(--color-base)] border border-[var(--line)] p-3 overflow-x-auto">
            {JSON.stringify(extra, null, 2)}
          </pre>
        </details>
      )}
    </>
  );
}
