import Link from "next/link";

export default function NotFound() {
  return <div className="shell py-24 text-center"><p className="t-eyebrow mb-3">404</p><h1 className="t-display text-[clamp(2rem,6vw,4rem)]">That hardware is not here.</h1><p className="mx-auto mt-4 max-w-lg text-ink-1">The product may have been retired or the address may be wrong. Search the live catalog or ask us to source it.</p><div className="mt-7 flex justify-center gap-3"><Link href="/catalog" className="btn btn-primary">Search catalog</Link><Link href="/quote" className="btn btn-ghost">Request a quote</Link></div></div>;
}
