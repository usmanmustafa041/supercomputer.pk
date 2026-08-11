"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND, NAV } from "@/lib/brand";
import Mark from "./Mark";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // "/" focuses search, the way every tool the audience already uses behaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        stuck ? "bg-void/92 backdrop-blur-xl border-b" : "bg-transparent border-b border-transparent"
      }`}
    >
      {/* status strip — real, useful, not a marketing bar */}
      <div className="hidden md:block border-b border-[var(--line)] bg-base/60">
        <div className="shell flex items-center justify-between h-8 text-[11px] t-data text-ink-2">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-ink-1">Lahore &amp; Karachi stock live</span>
            </span>
            <span className="hidden lg:inline">Landed pricing includes duty &amp; GST</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="hover:text-ink transition-colors">
              {BRAND.phone}
            </a>
            <span className="hidden lg:inline">{BRAND.hours}</span>
          </div>
        </div>
      </div>

      <div className="shell flex items-center gap-3 h-16">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group" aria-label={`${BRAND.name} home`}>
          <Mark className="h-7 w-7 text-acc transition-transform duration-300 group-hover:rotate-90" />
          <span className="t-display text-[19px] tracking-[-0.02em] leading-none">{BRAND.name}</span>
        </Link>

        <nav className="hidden lg:flex items-center ml-6" aria-label="Primary">
          {NAV.map((n) => {
            const active = path === n.href || path.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active ? "text-ink" : "text-ink-1 hover:text-ink"
                }`}
              >
                {n.label}
                <span
                  className={`absolute left-3.5 right-3.5 -bottom-px h-px bg-acc transition-transform duration-300 origin-left ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <form action="/catalog" className="hidden md:flex ml-auto relative w-56 lg:w-72">
          <input
            ref={searchRef}
            name="q"
            type="search"
            placeholder="Search 2,770 parts"
            aria-label="Search catalog"
            className="field h-9 pr-9 text-[13px]"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 t-data text-[10px] text-ink-3 border border-[var(--line-mid)] px-1.5 py-0.5 pointer-events-none">
            /
          </kbd>
        </form>

        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          <Link href="/configure" className="btn btn-primary btn-sm">
            Configure
          </Link>
        </div>

        <div className="lg:hidden ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden btn btn-ghost btn-sm"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="lg:hidden border-t border-[var(--line)] bg-base" aria-label="Mobile">
          <div className="shell py-3">
            <form action="/catalog" className="mb-3">
              <input name="q" type="search" placeholder="Search parts" className="field" aria-label="Search catalog" />
            </form>
            {/* Closing on click rather than in an effect keyed on pathname —
                same result, one render pass instead of two. */}
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block py-3 border-b border-[var(--line)] last:border-0"
              >
                <span className="text-[15px] font-medium">{n.label}</span>
                <span className="block text-[12px] text-ink-2 mt-0.5">{n.desc}</span>
              </Link>
            ))}
            <Link href="/configure" onClick={() => setOpen(false)} className="btn btn-primary w-full mt-4">
              Open configurator
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
