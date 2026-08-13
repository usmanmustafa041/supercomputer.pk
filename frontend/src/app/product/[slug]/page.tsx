import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PartArt from "@/components/art/PartArt";
import SpecTable from "@/components/catalog/SpecTable";
import ProductCard from "@/components/catalog/ProductCard";
import PhotoGallery, { type Photo } from "@/components/catalog/PhotoGallery";
import { catalog, products } from "@/lib/api/resources";
import {
  CONDITION_LABEL, CONDITION_NOTE, KIND_LABEL, getById, getBySlug, getFamily, search, type Product,
} from "@supercomputers/shared";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getBySlug(slug) ?? getById(slug);
  if (!p) return { title: "Not found" };
  return {
    title: `${p.brand} ${p.model}`,
    description: `${p.highlights[0]} ${CONDITION_LABEL[p.condition]}, ${p.warrantyMonths} month warranty, quoted per order.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let p: Product | undefined = getBySlug(slug) ?? getById(slug);
  if (!p) {
    try {
      p = await catalog.productBySlug(slug);
    } catch {
      notFound();
    }
  }
  if (!p) notFound();

  const siblings = getFamily(p.family).filter((s) => s.id !== p.id);
  const related = search({ kind: [p.kind], tags: p.tags.slice(0, 1), perPage: 5 }).items.filter((r) => r.family !== p.family);

  // The listing itself is generated, so it renders with or without a database.
  // Photographs are the one part that needs one, and a page that will not load
  // because a photograph could not be found would be a poor trade.
  let photos: Photo[] = [];
  try {
    photos = await products.images(p.id);
  } catch {
    photos = [];
  }

  return (
    <div className="shell py-8 md:py-11">
      <nav className="flex flex-wrap items-center gap-2 text-[11.5px] t-data text-ink-3 mb-7" aria-label="Breadcrumb">
        <Link href="/catalog" className="hover:text-ink transition-colors">Catalogue</Link>
        <span aria-hidden>/</span>
        <Link href={`/catalog?kind=${p.kind}`} className="hover:text-ink transition-colors">{KIND_LABEL[p.kind]}</Link>
        <span aria-hidden>/</span>
        <span className="text-ink-1">{p.brand}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-8 items-start">
        <div className="min-w-0">
          {/* -------------------------------------------------------- header */}
          <header className="mb-7">
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <span className={`pill ${p.condition !== "new" ? "pill-acc" : ""}`}>{CONDITION_LABEL[p.condition]}</span>
              <span className="pill">{p.segment}</span>
              {p.avail.inHouse > 0 && (
                <span className="pill pill-ok"><span className="live-dot" />{p.avail.inHouse} in Lahore stock</span>
              )}
            </div>
            <p className="t-eyebrow mb-2">{p.brand}</p>
            <h1 className="t-display text-[clamp(1.8rem,4.2vw,3rem)]">{p.model}</h1>
            <p className="t-data text-[11.5px] text-ink-3 mt-3">
              MPN {p.mpn} · SKU {p.id} · Released {p.releaseYear}
            </p>
          </header>

          <div className="panel border border-[var(--line)] mb-7">
            <PartArt product={p} className="w-full aspect-[200/152] max-h-[26rem]" />
          </div>

          <p className="text-[12px] text-ink-3 mb-9 leading-relaxed">
            The illustration is a scale technical drawing generated from this SKU&apos;s own dimensions and
            layout, not a photograph. Slot width, card length, connector count and bay layout are drawn to the
            figures in the table below.
            {photos.length > 0 && " Photographs of the unit itself follow."}
          </p>

          <PhotoGallery photos={photos} subject={`${p.brand} ${p.model}`} />

          {/* --------------------------------------------------- highlights */}
          <section className="mb-9">
            <h2 className="t-label mb-3.5">Why this part</h2>
            <ul className="space-y-2.5">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-1">
                  <span className="mt-2 w-1 h-1 bg-acc shrink-0" aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          </section>

          {/* --------------------------------------------------- condition */}
          <section className="mb-9 panel p-5">
            <h2 className="t-data text-[12px] uppercase tracking-[0.1em] text-acc">{CONDITION_LABEL[p.condition]}</h2>
            <p className="text-[13px] text-ink-1 mt-2.5 leading-relaxed">{CONDITION_NOTE[p.condition]}</p>
            <p className="text-[13px] text-ink-1 mt-2.5 leading-relaxed">
              Covered by a <strong className="text-ink">{p.warrantyMonths} month</strong> warranty
              {p.condition === "new" ? " from the manufacturer where honoured locally, and by us where not." : " from us directly."}
            </p>
          </section>

          {/* ------------------------------------------------------- specs */}
          <section className="mb-9">
            <h2 className="t-display text-[22px] mb-4">Specification</h2>
            <SpecTable p={p} />
          </section>

          {/* ---------------------------------------------------- siblings */}
          {siblings.length > 0 && (
            <section className="mb-9">
              <h2 className="t-display text-[22px] mb-1.5">Same part, other grades and partners</h2>
              <p className="text-[13px] text-ink-1 mb-4 leading-relaxed">
                {siblings.length} other SKU{siblings.length > 1 ? "s" : ""} built on the same processor. The price
                difference comes from condition grade, board partner and cooler design, not from the chip itself.
              </p>
              <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
                {siblings.slice(0, 8).map((s) => (
                  <Link
                    key={s.id}
                    href={`/product/${s.slug}`}
                    className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-raised)] transition-colors"
                  >
                    <span className="text-[12.5px] flex-1 min-w-0 truncate">
                      <span className="text-ink-2">{s.brand}</span> {s.model}
                    </span>
                    <span className={`pill shrink-0 ${s.condition !== "new" ? "pill-acc" : ""}`}>
                      {CONDITION_LABEL[s.condition]}
                    </span>
                    <span className="t-data text-[11px] text-ink-3 w-24 text-right shrink-0">
                      {s.avail.inHouse > 0 ? `${s.avail.inHouse} in stock` : `${s.avail.leadDays}d lead`}
                    </span>
                  </Link>
                ))}
              </div>
              {siblings.length > 8 && (
                <Link href={`/catalog?q=${encodeURIComponent(p.searchKey)}`} className="btn btn-ghost btn-sm mt-3">
                  See all {siblings.length + 1} variants
                </Link>
              )}
            </section>
          )}
        </div>

        {/* --------------------------------------------------------- buy rail */}
        <aside className="lg:sticky lg:top-28 space-y-4">
          <div className="panel-raised ticked">
            <div className="p-5 border-b border-[var(--line)]">
              <div className="t-display text-[22px]">Quoted per order</div>
              <p className="t-data text-[10.5px] text-ink-3 mt-1.5 leading-relaxed">
                Send the request and we reply within one working day with availability, lead time and a landed
                quotation, duty and taxes included.
              </p>
            </div>

            <div className="p-5 border-b border-[var(--line)]">
              <h2 className="t-label mb-2.5">Availability</h2>
              <div className="flex items-center gap-2 mb-2">
                {p.avail.inHouse > 0 ? (
                  <span className="pill pill-ok">
                    <span className="live-dot" />
                    {p.avail.inHouse} in stock
                  </span>
                ) : (
                  <span className="pill pill-cool">{p.avail.leadDays} working days</span>
                )}
              </div>
              <p className="text-[12.5px] text-ink-1 leading-relaxed">
                {p.avail.inHouse > 0
                  ? `Held in our ${BRAND.hq} warehouse, tested and ready to dispatch.`
                  : p.avail.indentOnly
                    ? `Brought in on our own import channel against a confirmed order, about ${p.avail.leadDays} working days, landed with duty and clearing handled by us.`
                    : `Not held at present. About ${p.avail.leadDays} working days from our regional stock.`}
              </p>
              {/* Quoting runs through the configurator, so a part goes into a
                  build first rather than becoming a one-line request. */}
              <Link href={`/configure?b=${p.id}`} className="btn btn-primary w-full mt-4">
                Add to a configuration
              </Link>
            </div>

            <div className="p-5">
              <h2 className="t-label mb-2.5">Included with every order</h2>
              <ul className="space-y-2">
                {[
                  `${p.warrantyMonths} month warranty, handled here rather than shipped abroad`,
                  "Tested and, where used, re-pasted before dispatch",
                  `Delivered to ${BRAND.cities.join(", ")} and onward by courier`,
                  "One invoice and one point of contact for the whole configuration",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[12.5px] text-ink-1 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 bg-acc shrink-0" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="t-display text-[22px] mb-4">Also considered</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {related.slice(0, 5).map((r) => (
              <ProductCard key={r.id} p={r} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
