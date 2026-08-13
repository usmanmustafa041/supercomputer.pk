"use client";

/**
 * The photograph panel on a product's edit page.
 *
 * Built for someone working on a phone in a warehouse with the part in front
 * of them: one large button that opens the camera roll, the chosen files listed
 * back before anything is sent, and every control a thumb-sized target rather
 * than an icon.
 *
 * There is no drag-to-reorder. Dragging is fiddly on a touchscreen and
 * invisible to a keyboard, and the ordering only ever needs small corrections,
 * so it is two arrow buttons instead.
 */

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { describeImage, removeImage, reorderImage, uploadImages, type ImageState } from "./image-actions";
import type { ProductImage as ProductImageRow } from "@/lib/api/types";
import { imageSrc } from "@/lib/api/media";

const MAX = 12;

function kb(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

function Upload({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending || count === 0}>
      {pending ? "Uploading" : count === 0 ? "Upload" : `Upload ${count}`}
    </button>
  );
}

export default function ImageManager({
  sku,
  slug,
  images,
}: {
  sku: string;
  slug: string;
  images: ProductImageRow[];
}) {
  const [state, action] = useActionState<ImageState, FormData>(uploadImages, undefined);
  const [chosen, setChosen] = useState<File[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const room = MAX - images.length;

  /**
   * Emptied only once the upload has actually landed.
   *
   * It is tempting to clear the file input in onSubmit, and it silently breaks
   * everything: React reads the form's contents in its own submit listener,
   * which runs after that one, so the files are already gone by the time it
   * builds the request and the action receives an empty list. Anything that
   * failed is left in place so it can be retried or removed.
   */
  useEffect(() => {
    if (!state?.ok) return;
    setChosen([]);
    if (input.current) input.current.value = "";
  }, [state]);

  return (
    <section className="panel p-4 sm:p-5 grid gap-4">
      <div>
        <h2 className="t-label">Photographs</h2>
        <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
          Photographs of the actual unit. The cover image stays the technical drawing, so the catalogue keeps one
          consistent look; these appear on the product page underneath it, in the order set here. JPEG, PNG or
          WebP, up to 8MB each, {MAX} per product.
        </p>
      </div>

      {/* ------------------------------------------------------------- upload */}
      <form action={action} className="grid gap-3">
        <input type="hidden" name="sku" value={sku} />

        <label
          className={`grid gap-1 place-items-center text-center px-4 py-6 border border-dashed border-[var(--line-mid)] cursor-pointer transition-colors hover:bg-[var(--color-raised)] ${
            room <= 0 ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <span className="t-data text-[13px] text-acc uppercase tracking-[0.08em]">Choose photos</span>
          <span className="text-[12px] text-ink-3">
            {room > 0 ? `Take one now or pick from the gallery. Room for ${room} more.` : "Maximum reached."}
          </span>
          <input
            ref={input}
            type="file"
            name="photos"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => setChosen(Array.from(e.target.files ?? []))}
          />
        </label>

        {chosen.length > 0 && (
          <ul className="grid gap-1.5 text-[12.5px]">
            {chosen.map((f) => (
              <li key={f.name + f.size} className="flex items-center gap-2 text-ink-1 min-w-0">
                <span className="w-1 h-1 bg-acc shrink-0" aria-hidden />
                <span className="truncate">{f.name}</span>
                <span className="t-data text-[11px] text-ink-3 ml-auto shrink-0">{kb(f.size)}</span>
              </li>
            ))}
          </ul>
        )}

        {state?.error && (
          <p
            role="alert"
            className="text-[12.5px] text-warn border border-[color-mix(in_srgb,var(--color-warn)_34%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2 leading-relaxed"
          >
            {state.error}
          </p>
        )}
        {state?.ok && !state.error && <p className="text-[12.5px] text-ok">{state.ok}</p>}

        <div className="flex gap-3">
          <Upload count={chosen.length} />
          {chosen.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setChosen([]);
                if (input.current) input.current.value = "";
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* --------------------------------------------------------- the photos */}
      {images.length === 0 ? (
        <p className="text-[13px] text-ink-3 border-t border-[var(--line)] pt-4">
          No photographs yet. The product page will show the drawing on its own, which is a perfectly good
          listing, just a less convincing one.
        </p>
      ) : (
        <ul className="grid gap-3 border-t border-[var(--line)] pt-4">
          {images.map((img, i) => (
            <li key={img.id} className="flex gap-3 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- served
                  from disk by our own route, not through the image optimiser */}
              <img
                src={imageSrc(img.id)}
                alt={img.alt ?? ""}
                width={img.width ?? undefined}
                height={img.height ?? undefined}
                loading="lazy"
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover bg-[var(--color-base)] border border-[var(--line)] shrink-0"
              />

              <div className="min-w-0 flex-1 grid gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="t-data text-[11px] text-ink-3 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[12.5px] truncate text-ink-1">{img.original_name ?? `Photograph ${img.id}`}</span>
                </div>

                <form action={describeImage} className="flex gap-2">
                  <input type="hidden" name="id" value={img.id} />
                  <input type="hidden" name="sku" value={sku} />
                  <input type="hidden" name="slug" value={slug} />
                  <input
                    name="alt"
                    defaultValue={img.alt ?? ""}
                    placeholder="Describe it, for example: front panel with drive caddies"
                    className="field h-9 text-[12.5px] flex-1 min-w-0"
                  />
                  <button className="btn btn-sm shrink-0">Save</button>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={reorderImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="sku" value={sku} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="direction" value="up" />
                    <button className="btn btn-sm" disabled={i === 0} aria-label="Move earlier">
                      Up
                    </button>
                  </form>
                  <form action={reorderImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="sku" value={sku} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="direction" value="down" />
                    <button className="btn btn-sm" disabled={i === images.length - 1} aria-label="Move later">
                      Down
                    </button>
                  </form>
                  <span className="t-data text-[11px] text-ink-3">
                    {img.width && img.height ? `${img.width}x${img.height} · ` : ""}
                    {kb(img.bytes)}
                  </span>
                  <form action={removeImage} className="ml-auto">
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="sku" value={sku} />
                    <input type="hidden" name="slug" value={slug} />
                    <button className="btn btn-sm text-warn border-[color-mix(in_srgb,var(--color-warn)_40%,transparent)]">
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
