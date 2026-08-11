"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/quotes", label: "Requests" },
  { href: "/", label: "View site" },
] as const;

export default function AdminNav() {
  const path = usePathname();
  return (
    // min-w-0 is what lets this shrink. A flex child defaults to its content
    // width, so without it the nav shoved the sign-out button off a phone
    // screen instead of scrolling inside itself.
    <nav className="flex items-center gap-1 overflow-x-auto no-bar min-w-0" aria-label="Admin">
      {LINKS.map((l) => {
        // "/admin" would otherwise light up on every child route.
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href) && l.href !== "/";
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            // shrink-0 as well as whitespace-nowrap: without it the links
            // squash into each other rather than letting the nav scroll.
            className={`shrink-0 px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors ${
              active ? "text-ink border-b border-acc" : "text-ink-1 hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
