"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveProduct, type ActionState } from "../actions";
import type { Product } from "@/lib/api/types";
import { CONDITION_LABEL, KIND_LABEL } from "@/lib/catalog/types";

const KINDS = Object.entries(KIND_LABEL);
const CONDITIONS = Object.entries(CONDITION_LABEL);
const SEGMENTS = [
  ["datacenter", "Datacenter"],
  ["workstation", "Workstation"],
  ["desktop", "Desktop"],
  ["edge", "Edge"],
] as const;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="t-label">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

function Save({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving" : isNew ? "Add product" : "Save changes"}
    </button>
  );
}

export default function ProductForm({ product }: { product?: Product }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProduct, undefined);
  const isNew = !product;

  return (
    <form action={action} className="grid gap-6">
      {product && <input type="hidden" name="existing_sku" value={product.sku} />}

      {state?.error && (
        <p
          role="alert"
          className="text-[13px] text-warn border border-[color-mix(in_srgb,var(--color-warn)_34%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2"
        >
          {state.error}
        </p>
      )}

      <section className="panel p-5 grid gap-4">
        <h2 className="t-label">What it is</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="SKU" hint={isNew ? "Our own code. Cannot be changed later." : "Fixed once created."}>
            <input
              name="sku"
              required
              defaultValue={product?.sku}
              readOnly={!isNew}
              className="field t-data disabled:opacity-60"
            />
          </Field>
          <Field label="Category">
            <select name="kind" defaultValue={product?.kind ?? "gpu"} className="field">
              {KINDS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <input name="brand" required defaultValue={product?.brand} className="field" />
          </Field>
          <Field label="Model">
            <input name="model" required defaultValue={product?.model} className="field" />
          </Field>
          <Field label="Manufacturer part number" hint="Optional. Helps when reordering.">
            <input name="mpn" defaultValue={product?.mpn ?? ""} className="field" />
          </Field>
          <Field label="Family" hint="Groups variants of the same part. Optional.">
            <input name="family" defaultValue={product?.family ?? ""} className="field" />
          </Field>
          <Field label="Web address" hint="Leave blank and we will make one from the name.">
            <input name="slug" defaultValue={product?.slug ?? ""} className="field t-data" />
          </Field>
          <Field label="Year released">
            <input
              name="release_year"
              type="number"
              min={1990}
              max={2100}
              defaultValue={product?.release_year ?? new Date().getFullYear()}
              className="field"
            />
          </Field>
        </div>
      </section>

      <section className="panel p-5 grid gap-4">
        <h2 className="t-label">Condition and stock</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Condition">
            <select name="condition" defaultValue={product?.condition ?? "new"} className="field">
              {CONDITIONS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Meant for">
            <select name="segment" defaultValue={product?.segment ?? "datacenter"} className="field">
              {SEGMENTS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Units in stock">
            <input
              name="stock_qty"
              type="number"
              min={0}
              defaultValue={product?.stock_qty ?? 0}
              className="field"
            />
          </Field>
          <Field label="Warranty (months)">
            <input
              name="warranty_months"
              type="number"
              min={0}
              defaultValue={product?.warranty_months ?? 12}
              className="field"
            />
          </Field>
          <Field label="Days to deliver if not in stock">
            <input
              name="lead_days"
              type="number"
              min={0}
              defaultValue={product?.lead_days ?? 0}
              className="field"
            />
          </Field>
          <Field label="Internal cost reference (PKR)" hint="Never shown on the site. For your own records.">
            <input
              name="price_pkr"
              type="number"
              min={0}
              step="0.01"
              defaultValue={product?.price_pkr ?? 0}
              className="field"
            />
          </Field>
        </div>

        <div className="grid gap-2.5 pt-1">
          <label className="flex items-center gap-2.5 text-[13px]">
            <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} />
            Show this on the site
          </label>
          <label className="flex items-center gap-2.5 text-[13px]">
            <input type="checkbox" name="indent_only" defaultChecked={product?.indent_only ?? false} />
            Order in on request only, never held in stock
          </label>
          <label className="flex items-center gap-2.5 text-[13px]">
            <input
              type="checkbox"
              name="price_on_request"
              defaultChecked={product?.price_on_request ?? true}
            />
            Price on request
          </label>
        </div>
      </section>

      <section className="panel p-5 grid gap-4">
        <h2 className="t-label">Details</h2>
        <Field label="Selling points" hint="One per line. These show on the product page.">
          <textarea
            name="highlights"
            rows={4}
            defaultValue={(product?.highlights ?? []).join("\n")}
            className="field h-auto py-2 leading-relaxed"
          />
        </Field>
        <Field label="Tags" hint="One per line. Used for filtering.">
          <textarea
            name="tags"
            rows={3}
            defaultValue={(product?.tags ?? []).join("\n")}
            className="field h-auto py-2 leading-relaxed"
          />
        </Field>
        <Field
          label="Specifications"
          hint={
            "JSON, because every category needs different numbers. A graphics card has vram_gb, " +
            "a power supply has watts. The configurator reads these to check what fits, so get them right."
          }
        >
          <textarea
            name="specs"
            rows={12}
            spellCheck={false}
            defaultValue={JSON.stringify(product?.specs ?? {}, null, 2)}
            className="field h-auto py-2 t-data text-[12px] leading-relaxed"
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <Save isNew={isNew} />
        <Link href="/admin/products" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
