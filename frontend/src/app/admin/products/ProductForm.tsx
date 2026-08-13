"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProduct, type ActionState } from "../actions";
import SpecFields from "./SpecFields";
import type { ProductRow } from "@/lib/api/types";
import { CONDITION_LABEL, KIND_LABEL, type Kind } from "@supercomputers/shared";

const KINDS = Object.entries(KIND_LABEL) as [Kind, string][];
const CONDITIONS = Object.entries(CONDITION_LABEL);
const SEGMENTS = [
  ["datacenter", "Datacenter"],
  ["workstation", "Workstation"],
  ["desktop", "Desktop"],
  ["edge", "Edge"],
] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="t-label">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink-3 leading-snug">{hint}</span>}
    </label>
  );
}

function Save({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary flex-1 sm:flex-none" disabled={pending}>
      {pending ? "Saving" : isNew ? "Add product" : "Save changes"}
    </button>
  );
}

export default function ProductForm({ product }: { product?: ProductRow }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProduct, undefined);
  const isNew = !product;

  // Held in state, because the specification fields below change with it.
  const [kind, setKind] = useState<Kind>((product?.kind as Kind) ?? "gpu");

  return (
    // Bottom padding clears the pinned save bar and the tab bar beneath it.
    <form action={action} className="grid gap-5 pb-32 md:pb-6">
      {product && <input type="hidden" name="existing_sku" value={product.sku} />}

      {state?.error && (
        <p
          role="alert"
          className="text-[13px] text-warn border border-[color-mix(in_srgb,var(--color-warn)_34%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2"
        >
          {state.error}
        </p>
      )}

      <section className="panel p-4 sm:p-5 grid gap-4">
        <h2 className="t-label">What it is</h2>
        <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
          <Field label="Category" hint="This decides which details we ask for below.">
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="field"
            >
              {KINDS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SKU" hint={isNew ? "Our own code for it. Cannot be changed later." : "Fixed once created."}>
            <input
              name="sku"
              required
              defaultValue={product?.sku}
              readOnly={!isNew}
              className="field t-data read-only:opacity-60"
            />
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
          <Field label="Family" hint="Groups different versions of the same part. Optional.">
            <input name="family" defaultValue={product?.family ?? ""} className="field" />
          </Field>
          <Field label="Web address" hint="Leave blank and we will make one from the name.">
            <input name="slug" defaultValue={product?.slug ?? ""} className="field t-data" />
          </Field>
          <Field label="Year released">
            <input
              name="release_year"
              type="number"
              inputMode="numeric"
              min={1990}
              max={2100}
              defaultValue={product?.release_year ?? new Date().getFullYear()}
              className="field"
            />
          </Field>
        </div>
      </section>

      <section className="panel p-4 sm:p-5 grid gap-4">
        <h2 className="t-label">Condition and stock</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
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
              inputMode="numeric"
              min={0}
              defaultValue={product?.stock_qty ?? 0}
              className="field"
            />
          </Field>
          <Field label="Warranty (months)">
            <input
              name="warranty_months"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={product?.warranty_months ?? 12}
              className="field"
            />
          </Field>
          <Field label="Days to deliver if not in stock">
            <input
              name="lead_days"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={product?.lead_days ?? 0}
              className="field"
            />
          </Field>
          <Field label="Cost reference (PKR)" hint="Never shown on the site. For your own records.">
            <input
              name="price_pkr"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={product?.price_pkr ?? 0}
              className="field"
            />
          </Field>
        </div>

        <div className="grid gap-2.5 pt-1">
          <label className="flex items-center gap-2.5 text-[13.5px]">
            <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="h-4 w-4" />
            Show this on the site
          </label>
          <label className="flex items-center gap-2.5 text-[13.5px]">
            <input type="checkbox" name="indent_only" defaultChecked={product?.indent_only ?? false} className="h-4 w-4" />
            Order in on request only, never held in stock
          </label>
          <label className="flex items-center gap-2.5 text-[13.5px]">
            <input
              type="checkbox"
              name="price_on_request"
              defaultChecked={product?.price_on_request ?? true}
              className="h-4 w-4"
            />
            Price on request
          </label>
        </div>
      </section>

      <section className="panel p-4 sm:p-5 grid gap-4">
        <div>
          <h2 className="t-label">{KIND_LABEL[kind]} details</h2>
          <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
            These are the figures the compatibility checks read, so they decide whether a build using this part
            passes or fails. Leave anything you do not know blank.
          </p>
        </div>
        {/* Remounts when the category changes, so the fields reset to that
            category's defaults instead of keeping the previous one's values. */}
        <SpecFields key={kind} kind={kind} specs={product?.specs ?? {}} />
      </section>

      <section className="panel p-4 sm:p-5 grid gap-4">
        <h2 className="t-label">Description</h2>
        <label className="grid gap-1.5">
          <span className="t-label">Selling points</span>
          <textarea
            name="highlights"
            rows={4}
            defaultValue={(product?.highlights ?? []).join("\n")}
            className="field h-auto py-2 leading-relaxed"
          />
          <span className="text-[12px] text-ink-3">One per line. These show on the product page.</span>
        </label>
        <label className="grid gap-1.5">
          <span className="t-label">Tags</span>
          <textarea
            name="tags"
            rows={3}
            defaultValue={(product?.tags ?? []).join("\n")}
            className="field h-auto py-2 leading-relaxed"
          />
          <span className="text-[12px] text-ink-3">One per line. Used for filtering the catalogue.</span>
        </label>
      </section>

      {/* Pinned on a phone, so Save is always in reach however long the
          category's field list runs. `bottom-14` clears the tab bar, which is
          fixed at that height for exactly this reason. */}
      <div className="fixed md:static bottom-14 md:bottom-auto left-0 right-0 z-30 flex items-center gap-3 p-3 md:p-0 bg-base/95 backdrop-blur border-t md:border-0 border-[var(--line)]">
        <Save isNew={isNew} />
        <Link href="/admin/products" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
