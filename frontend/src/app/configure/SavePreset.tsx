"use client";

/**
 * Capturing the open configuration as a pre-built one. Administrators only.
 *
 * This exists so nobody ever has to type a parts list into the admin panel.
 * The configurator is where parts are chosen and where the compatibility checks
 * run, so it is the only sensible place to author a preset: build it, watch it
 * pass, name it, save it.
 *
 * Parts are recorded as a family key plus the exact model. The family survives
 * the catalogue being regenerated; the model pins which member of it, so a
 * configuration saved with a 1600W supply does not come back with the 750W one
 * that happens to share its family name.
 */

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { capturePreset, type PresetState } from "@/app/admin/presets/actions";
import type { BuildLine, Target } from "@supercomputers/shared";

function Save({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending || disabled}>
      {pending ? "Saving" : "Save configuration"}
    </button>
  );
}

export default function SavePreset({
  lines,
  target,
  blocking,
}: {
  lines: BuildLine[];
  target: Target;
  blocking: number;
}) {
  const [state, action] = useActionState<PresetState, FormData>(capturePreset, undefined);
  const [open, setOpen] = useState(false);

  // Close once it has been stored, so the panel is not left sitting there
  // looking like the save did not take.
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const picks = lines.map((l) => ({
    family: l.product.family,
    qty: l.qty,
    variant: l.product.model,
  }));

  const usable = picks.every((p) => p.family) && picks.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={lines.length === 0}
        aria-expanded={open}
        className={`btn btn-sm shrink-0 ${open ? "btn-primary" : "btn-ghost"}`}
        title={lines.length === 0 ? "Configure something first" : undefined}
      >
        Save as pre-built
      </button>

      {state?.ok && !open && <p className="absolute right-0 top-full mt-1 pill pill-ok whitespace-nowrap">Saved</p>}

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} aria-hidden />
          <form
            action={action}
            className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+0.5rem)]
                       z-50 sm:w-[24rem] panel-raised border border-[var(--line-mid)] shadow-[var(--lift-2)] p-4 grid gap-3"
          >
            <input type="hidden" name="picks" value={JSON.stringify(picks)} />
            <input type="hidden" name="target" value={target} />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="t-label">Save as a pre-built configuration</p>
                <p className="text-[11.5px] text-ink-3 mt-0.5 leading-snug">
                  {lines.length} line{lines.length === 1 ? "" : "s"}, offered to customers straight away.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm btn-icon shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {blocking > 0 && (
              <p className="text-[12px] text-warn leading-relaxed">
                This configuration has {blocking} blocking problem{blocking === 1 ? "" : "s"}. You can still save
                it, but customers will see the same failures the moment they load it.
              </p>
            )}

            {state?.error && (
              <p role="alert" className="text-[12px] text-err leading-relaxed">
                {state.error}
              </p>
            )}

            <label className="grid gap-1.5">
              <span className="t-label">Name</span>
              <input name="name" required placeholder="Atlas 200" className="field h-9 text-[13px]" />
            </label>

            <label className="grid gap-1.5">
              <span className="t-label">What it is</span>
              <input
                name="role"
                placeholder="Deskside AI workstation"
                className="field h-9 text-[13px]"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="t-label">Description</span>
              <textarea
                name="blurb"
                rows={3}
                placeholder="Who it is for and what the trade-off is."
                className="field h-auto py-2 text-[13px] leading-relaxed"
              />
            </label>

            <div className="flex items-center gap-2">
              <Save disabled={!usable} />
              <button type="button" onClick={() => setOpen(false)} className="btn btn-sm">
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
