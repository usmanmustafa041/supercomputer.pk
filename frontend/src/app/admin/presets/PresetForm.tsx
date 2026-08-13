"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePreset, type PresetState } from "./actions";
import type { PresetRow } from "@/lib/api/types";
import { TARGET_LABEL, type Target } from "@supercomputers/shared";

const TARGETS = Object.entries(TARGET_LABEL) as [Target, string][];

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary flex-1 sm:flex-none" disabled={pending}>
      {pending ? "Saving" : "Save changes"}
    </button>
  );
}

export default function PresetForm({ preset }: { preset: PresetRow }) {
  const [state, action] = useActionState<PresetState, FormData>(savePreset, undefined);

  return (
    <form action={action} className="grid gap-5 pb-32 md:pb-6">
      <input type="hidden" name="slug" value={preset.slug} />

      {state?.error && (
        <p
          role="alert"
          className="text-[13px] text-warn border border-[color-mix(in_srgb,var(--color-warn)_34%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2"
        >
          {state.error}
        </p>
      )}

      <section className="panel p-4 sm:p-5 grid gap-4">
        <h2 className="t-label">How it is presented</h2>

        <label className="grid gap-1.5">
          <span className="t-label">Name</span>
          <input name="name" required defaultValue={preset.name} className="field" />
          <span className="text-[12px] text-ink-3">What the customer sees first, for example Atlas 200.</span>
        </label>

        <label className="grid gap-1.5">
          <span className="t-label">What it is</span>
          <input
            name="role"
            defaultValue={preset.role}
            placeholder="Deskside AI workstation"
            className="field"
          />
          <span className="text-[12px] text-ink-3">
            Three or four words, shown in small type above the name.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="t-label">Where it goes</span>
          <select name="target" defaultValue={preset.target} className="field">
            {TARGETS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-ink-3">
            Loading it switches the configurator to this. It should match the case in the parts list below.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="t-label">Description</span>
          <textarea
            name="blurb"
            rows={4}
            defaultValue={preset.blurb}
            className="field h-auto py-2 leading-relaxed"
          />
          <span className="text-[12px] text-ink-3">
            Two sentences on who it is for and what the trade-off is. Shown when someone opens it in the list.
          </span>
        </label>

        <label className="flex items-center gap-2.5 text-[13.5px]">
          <input type="checkbox" name="is_active" defaultChecked={preset.is_active} className="h-4 w-4" />
          Offer this in the configurator
        </label>
      </section>

      <div className="fixed md:static bottom-14 md:bottom-auto left-0 right-0 z-30 flex items-center gap-3 p-3 md:p-0 bg-base/95 backdrop-blur border-t md:border-0 border-[var(--line)]">
        <Save />
        <Link href="/admin/presets" className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
