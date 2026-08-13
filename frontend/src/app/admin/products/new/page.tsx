import Link from "next/link";
import ProductForm from "../ProductForm";

export const metadata = { title: "Add a product" };

export default function NewProductPage() {
  return (
    <div className="shell py-8 max-w-4xl">
      <Link href="/admin/products" className="text-[13px] text-ink-2 hover:text-ink">
        Back to products
      </Link>
      <h1 className="t-display text-2xl mt-2 mb-3">Add a product</h1>
      <p className="text-[13px] text-ink-2 mb-6 leading-relaxed max-w-prose">
        Fill this in and save. The listing gets its cover drawing automatically, generated from the details below,
        so it looks right on the catalogue from the moment it goes live. Photographs of the actual unit are added
        on the next screen.
      </p>
      <ProductForm />
    </div>
  );
}
