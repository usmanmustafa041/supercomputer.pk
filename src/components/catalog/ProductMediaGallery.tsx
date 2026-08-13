"use client";

import { useState } from "react";
import type { ProductMedia } from "@/lib/catalog/types";

const ROLE_LABEL: Record<ProductMedia["role"], string> = {
  main: "Product",
  gallery: "Gallery",
  serial: "Serial / stock unit",
  condition: "Condition evidence",
  packaging: "Packaging",
  inspection: "Inspection video",
};

export default function ProductMediaGallery({ media }: { media: ProductMedia[] }) {
  const ordered = [...media].sort((a, b) => (a.role === "main" ? -1 : b.role === "main" ? 1 : 0));
  const [active, setActive] = useState(0);
  const item = ordered[Math.min(active, ordered.length - 1)];

  if (!item) return null;
  return (
    <section aria-label="Product photography" className="mb-8">
      <div className="panel overflow-hidden bg-[var(--color-base)]">
        {item.type === "video" ? (
          <video key={item.url} src={item.url} controls preload="metadata" className="w-full aspect-[4/3] max-h-[34rem] object-contain" aria-label={item.alt} />
        ) : (
          // Object-storage hosts are admin-configurable.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.alt} className="w-full aspect-[4/3] max-h-[34rem] object-contain" loading="eager" />
        )}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-3 py-2">
          <span className="t-label text-[10px] text-acc">{ROLE_LABEL[item.role]}</span>
          <span className="text-[11px] text-ink-3 truncate">{item.alt}</span>
        </div>
      </div>
      {ordered.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2" role="list" aria-label="Choose product media">
          {ordered.map((entry, index) => (
            <button key={`${entry.url}-${index}`} type="button" onClick={() => setActive(index)} className={`relative border bg-[var(--color-base)] text-left overflow-hidden ${index === active ? "border-acc" : "border-[var(--line)]"}`} aria-pressed={index === active}>
              {entry.type === "video" ? (
                <div className="aspect-[4/3] grid place-items-center text-acc t-data text-[11px]">PLAY</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
              )}
              <span className="block px-2 py-1.5 t-data text-[9px] text-ink-2 truncate">{ROLE_LABEL[entry.role]}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
