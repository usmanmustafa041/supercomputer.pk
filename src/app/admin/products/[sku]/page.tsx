import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server";
import type { Product } from "@/lib/api/types";
import ProductForm from "../ProductForm";
import { retireProduct } from "../../actions";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;

  // The admin list, not the public one: a retired product must still be editable.
  const page = await api<{ items: Product[] }>(
    `/api/admin/products?q=${encodeURIComponent(sku)}&per_page=100`,
    { auth: true },
  );
  const product = page.items.find((p) => p.sku.toLowerCase() === decodeURIComponent(sku).toLowerCase());
  if (!product) notFound();

  return (
    <div className="shell py-8 max-w-4xl">
      <Link href="/admin/products" className="text-[13px] text-ink-2 hover:text-ink">
        Back to products
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-6">
        <div>
          <h1 className="t-display text-2xl">
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

      <ProductForm product={product} />

      <div className="panel p-5 mt-6 border-[color-mix(in_srgb,var(--color-warn)_28%,var(--line))]">
        <h2 className="t-label mb-2">Remove for good</h2>
        <p className="text-[13px] text-ink-2 mb-4 max-w-2xl">
          Retiring hides a product from the site but keeps it readable in old quote requests, which is
          almost always what you want. Deleting removes the row completely and cannot be undone. Only do
          that for something added by mistake.
        </p>
        <form action={retireProduct} className="flex flex-wrap items-center gap-3">
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
