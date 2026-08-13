import type { MetadataRoute } from "next";
import { publicProducts } from "@/lib/db/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const products = await publicProducts();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/systems`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/configure`, changeFrequency: "monthly", priority: 0.8 },
    ...products.map((product) => ({ url: `${base}/product/${product.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
