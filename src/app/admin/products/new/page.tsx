import Link from "next/link";
import ProductForm from "../ProductForm";

export const metadata = { title: "Add a product" };

export default function NewProductPage() {
  return (
    <div className="shell py-8 max-w-4xl">
      <Link href="/admin/products" className="text-[13px] text-ink-2 hover:text-ink">
        Back to products
      </Link>
      <h1 className="t-display text-2xl mt-2 mb-6">Add a product</h1>
      <ProductForm />
    </div>
  );
}
