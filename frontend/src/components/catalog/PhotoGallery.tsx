"use client";

/**
 * Photographs of the actual unit, under the drawing on a product page.
 *
 * The drawing above stays the cover everywhere, because it is generated from
 * the specification and therefore always exists and always matches the rest of
 * the grid. These are the supporting evidence: this particular machine, on our
 * shelf, with its scuffs.
 *
 * Deliberately not next/image. These are already served by our own route with
 * an immutable cache header, and routing them through the optimiser would add a
 * native image library to the deployment for no gain on files this size.
 */

import { useCallback, useEffect, useState } from "react";
import { imageSrc } from "@/lib/api/media";

export interface Photo {
  id: number;
  /** Row id. The URL is built from this, never from an object key. */
  alt: string | null;
  width: number | null;
  height: number | null;
}

export default function PhotoGallery({ photos, subject }: { photos: Photo[]; subject: string }) {
  const [active, setActive] = useState(0);
  const [full, setFull] = useState(false);

  const step = useCallback(
    (by: number) => setActive((i) => (i + by + photos.length) % photos.length),
    [photos.length],
  );

  // Arrow keys and Escape, but only while the full-screen view is open. Binding
  // them all the time would hijack arrow keys from the rest of the page.
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    // The page behind must not scroll while the overlay is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [full, step]);

  if (photos.length === 0) return null;

  const current = photos[active];
  const label = (p: Photo, i: number) => p.alt || `${subject}, photograph ${i + 1}`;

  return (
    <section className="mb-9">
      <div className="flex items-baseline justify-between gap-3 mb-3.5">
        <h2 className="t-label">Photographs of this unit</h2>
        <span className="t-data text-[11px] text-ink-3">
          {active + 1} / {photos.length}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFull(true)}
        className="block w-full border border-[var(--line)] bg-[var(--color-base)] overflow-hidden group cursor-zoom-in"
        aria-label="View this photograph full size"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served from
            disk by our own route, already cached immutably */}
        <img
          key={current.id}
          src={imageSrc(current.id)}
          alt={label(current, active)}
          width={current.width ?? undefined}
          height={current.height ?? undefined}
          className="w-full max-h-[30rem] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </button>

      {photos.length > 1 && (
        // Scrolls sideways on a phone rather than wrapping onto four rows and
        // pushing the specification off the screen.
        <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photograph ${i + 1}`}
              aria-current={i === active}
              className={`shrink-0 snap-start border transition-colors ${
                i === active ? "border-acc" : "border-[var(--line)] hover:border-[var(--line-mid)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc(p.id)}
                alt=""
                loading="lazy"
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover bg-[var(--color-base)]"
              />
            </button>
          ))}
        </div>
      )}

      {current.alt && <p className="text-[12.5px] text-ink-2 mt-2.5 leading-relaxed">{current.alt}</p>}

      {full && (
        <div
          className="fixed inset-0 z-[100] bg-void/95 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`${subject}, photograph ${active + 1} of ${photos.length}`}
        >
          <div className="flex items-center justify-between gap-3 px-4 h-14 shrink-0 border-b border-[var(--line)]">
            <span className="t-data text-[12px] text-ink-2">
              {active + 1} / {photos.length}
            </span>
            <button type="button" onClick={() => setFull(false)} className="btn btn-sm">
              Close
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFull(false)}
            className="flex-1 min-h-0 flex items-center justify-center p-4 cursor-zoom-out"
            aria-label="Close"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc(current.id)}
              alt={label(current, active)}
              className="max-w-full max-h-full object-contain"
            />
          </button>

          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-3 h-16 shrink-0 border-t border-[var(--line)]">
              <button type="button" onClick={() => step(-1)} className="btn btn-sm">
                Previous
              </button>
              <button type="button" onClick={() => step(1)} className="btn btn-sm">
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
