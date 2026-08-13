"use client";

/**
 * The pre-built configurations, behind one button.
 *
 * They used to be four cards laid across the top of the configurator, which
 * took a quarter of the screen before you had done anything and then vanished
 * the moment you added a part, exactly when you might want to compare against
 * one. Now they live behind a button that is always there, the list is compact
 * enough to hold a dozen of them, and each one explains itself before you
 * commit to loading it.
 *
 * Loading replaces the current configuration, so when there is something to
 * lose the button asks a second time rather than quietly wiping an hour's work.
 */

import { useEffect, useId, useRef, useState } from "react";
import type { PresetView } from "./slots";
import { TARGET_LABEL, type Target } from "@supercomputers/shared";

export default function PresetMenu({
  presets,
  onLoad,
  loading,
  hasLines,
  currentTarget,
}: {
  presets: PresetView[];
  onLoad: (slug: string) => void;
  loading: boolean;
  hasLines: boolean;
  currentTarget: Target;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Escape closes, and so does a click anywhere outside. Both are checked
  // against the wrapper rather than the button, or clicking inside the panel
  // would close the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Reopening should not resume half way through a confirmation.
  useEffect(() => {
    if (!open) {
      setExpanded(null);
      setConfirming(null);
    }
  }, [open]);

  function load(slug: string) {
    if (hasLines && confirming !== slug) {
      setConfirming(slug);
      return;
    }
    onLoad(slug);
    setOpen(false);
  }

  if (presets.length === 0) return null;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        aria-expanded={open}
        aria-controls={panelId}
        className={`btn btn-sm shrink-0 ${open ? "btn-primary" : "btn-ghost"}`}
      >
        {loading ? "Loading" : "Pre-built"}
        <span className="t-data text-[10px] opacity-70">{presets.length}</span>
      </button>

      {open && (
        <>
          {/* On a phone the panel is a sheet, so it gets a backdrop to sit on
              and something to tap that is not the list itself. */}
          <div
            className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id={panelId}
            className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+0.5rem)]
                       z-50 sm:w-[26rem] max-h-[75vh] sm:max-h-[32rem] overflow-y-auto
                       panel-raised border border-[var(--line-mid)] shadow-[var(--lift-2)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--color-surface)]">
              <div className="min-w-0">
                <p className="t-label">Pre-built configurations</p>
                <p className="text-[11.5px] text-ink-3 mt-0.5 leading-snug">
                  Starting points we build regularly. Load one and change anything.
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

            <ul className="divide-y divide-[var(--line)]">
              {presets.map((p) => {
                const isOpen = expanded === p.slug;
                const lineCount = p.picks.reduce((n, k) => n + (k.qty || 1), 0);
                return (
                  <li key={p.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(isOpen ? null : p.slug);
                        setConfirming(null);
                      }}
                      aria-expanded={isOpen}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-raised)] transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="t-label text-[9.5px] block">{p.role || TARGET_LABEL[p.target]}</span>
                        <span className="text-[13.5px] font-medium block truncate mt-0.5">{p.name}</span>
                      </span>
                      <span className="pill shrink-0">{TARGET_LABEL[p.target].split(" ")[0]}</span>
                      <span
                        className={`t-data text-[11px] text-ink-3 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        aria-hidden
                      >
                        ›
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 -mt-1">
                        <p className="text-[12.5px] text-ink-1 leading-relaxed">{p.blurb}</p>
                        <p className="t-data text-[10.5px] text-ink-3 mt-2">
                          {p.picks.length} line{p.picks.length === 1 ? "" : "s"} · {lineCount} part
                          {lineCount === 1 ? "" : "s"} · {TARGET_LABEL[p.target]}
                        </p>

                        {p.target !== currentTarget && (
                          <p className="text-[11.5px] text-ink-2 mt-2 leading-relaxed">
                            Loading this switches you to {TARGET_LABEL[p.target].toLowerCase()}.
                          </p>
                        )}

                        {confirming === p.slug ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-[11.5px] text-warn flex-1 min-w-0 leading-relaxed">
                              This replaces what you have configured so far.
                            </span>
                            <button type="button" onClick={() => load(p.slug)} className="btn btn-sm btn-primary">
                              Replace
                            </button>
                            <button type="button" onClick={() => setConfirming(null)} className="btn btn-sm">
                              Keep mine
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => load(p.slug)}
                            disabled={loading}
                            className="btn btn-primary btn-sm mt-3 w-full"
                          >
                            Load into the configurator
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
