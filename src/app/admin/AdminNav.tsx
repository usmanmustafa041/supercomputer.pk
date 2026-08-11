"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Mark from "@/components/site/Mark";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/quotes", label: "Requests" },
] as const;

function isActive(path: string, href: string) {
  // "/admin" would otherwise light up on every page beneath it.
  return href === "/admin" ? path === "/admin" : path.startsWith(href);
}

/**
 * The admin header.
 *
 * Built for a phone first: a bar with the mark, the company name and one menu
 * button, and the same links laid out along the top once there is room. The
 * tabs along the bottom on small screens mean the three places you actually go
 * are always one thumb-tap away, without opening anything.
 */
export default function AdminNav({
  email,
  signOut,
}: {
  email: string;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-base/95 backdrop-blur-xl">
        <div className="shell flex items-center gap-3 h-14">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0 group">
            <Mark className="h-6 w-6 shrink-0 text-acc transition-transform duration-300 group-hover:rotate-90" />
            <span className="min-w-0">
              <span className="block t-display text-[15px] leading-none tracking-[-0.02em] truncate">
                {BRAND.name}
              </span>
              <span className="block t-data text-[9.5px] leading-none text-ink-3 mt-1 tracking-[0.14em]">
                ADMIN
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Admin">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(path, l.href) ? "page" : undefined}
                className={`shrink-0 px-3 py-1.5 text-[13px] whitespace-nowrap transition-colors ${
                  isActive(path, l.href) ? "text-ink border-b border-acc" : "text-ink-1 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link href="/" className="hidden sm:inline-block btn btn-sm">
              View site
            </Link>
            <span className="hidden lg:block text-[12px] text-ink-2 truncate max-w-[14rem]">{email}</span>
            <form action={signOut} className="hidden md:block">
              <button type="submit" className="btn btn-sm">
                Sign out
              </button>
            </form>
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden btn btn-sm"
              aria-expanded={open}
              aria-controls="admin-menu"
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {open && (
          <div id="admin-menu" className="md:hidden border-t border-[var(--line)] bg-base">
            <div className="shell py-3 grid gap-1">
              <p className="text-[12px] text-ink-3 pb-2 truncate">Signed in as {email}</p>
              <Link href="/" onClick={() => setOpen(false)} className="btn w-full">
                View the site
              </Link>
              <form action={signOut}>
                <button type="submit" className="btn w-full mt-1">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Thumb-reach tabs. Only on phones; the top nav covers everything else.
          Fixed height, because the sticky save bar on the product form sits
          directly above it and has to know how tall it is. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-3 h-14 border-t border-[var(--line)] bg-base/95 backdrop-blur-xl"
        aria-label="Admin sections"
      >
        {LINKS.map((l) => {
          const active = isActive(path, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center text-[12.5px] transition-colors ${
                active ? "text-acc border-t-2 border-acc -mt-px" : "text-ink-2"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
