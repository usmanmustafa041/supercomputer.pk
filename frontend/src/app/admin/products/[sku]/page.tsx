import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/lib/api/resources";

import ProductForm from "../ProductForm";
import ImageManager from "../ImageManager";
import { retire } from "../../actions";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ sku: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { sku } = await params;
  const { created } = await searchParams;
  const product = await products.bySku(decodeURIComponent(sku));
  if (!product) notFound();

  const images = await products.images(product.sku);

  return (
    <div className="shell py-6 sm:py-8 max-w-4xl">
      <Link href="/admin/products" className="text-[13px] text-ink-2 hover:text-ink">
        Back to products
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-5">
        <div className="min-w-0">
          <h1 className="t-display text-xl sm:text-2xl leading-tight">
            {product.brand} {product.model}
          </h1>
          <p className="t-data text-[12px] text-ink-3 mt-1">{product.sku}</p>
        </div>
        {product.is_active && (
          <Link href={`/product/${product.slug}`} className="btn btn-sm">
            View on site
          </Link>
        )}
      </div>

      {created && (
        <p className="panel p-4 mb-5 text-[13px] leading-relaxed border-[color-mix(in_srgb,var(--color-acc)_30%,var(--line))]">
          Added. It is live on the site now, listed with its generated drawing. Add photographs of the actual unit
          below if you have them.
        </p>
      )}

      <ProductForm product={product} />

      {/* Outside the form above, not inside it: a form cannot contain another
          one, and uploading has to post on its own without saving the rest. */}
      <div className="mt-6">
        <ImageManager sku={product.sku} slug={product.slug} images={images} />
      </div>

      <div className="panel p-4 sm:p-5 mt-6 border-[color-mix(in_srgb,var(--color-warn)_28%,var(--line))]">
        <h2 className="t-label mb-2">Remove for good</h2>
        <p className="text-[13px] text-ink-2 mb-4 leading-relaxed">
          Retiring hides a product from the site but keeps it readable in old quote requests, which is almost
          always what you want. Deleting removes it completely and cannot be undone. Only do that for something
          added by mistake.
        </p>
        <form action={retire}>
          <input type="hidden" name="sku" value={product.sku} />
          <input type="hidden" name="hard" value="on" />
          <button className="btn btn-sm text-warn border-[color-mix(in_srgb,var(--color-warn)_40%,transparent)]">
            Delete {product.sku} permanently
          </button>
        </form>
      </div>
    </div>
  );
}
