"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartArt from "@/components/art/PartArt";
import { keyStats } from "@/components/catalog/ProductCard";
import { CONDITION_LABEL, KIND_LABEL, type Kind, type Product } from "@/lib/catalog";

interface Props {
  kind: Kind;
  hint: string;
  onPick: (p: Product) => void;
  onClose: () => void;
}

export default function PartPicker({ kind, hint, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  // Quote-only storefront: capability is the only sort, price never appears.
  const sort = "perf" as const;
  const [stockOnly, setStockOnly] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter changes reset pagination. Doing this in the handlers rather than in
  // an effect avoids a render pass that fetches page N of the old result set.
  const changeQ = (v: string) => { setQ(v); setPage(1); };
  const toggleStock = () => { setStockOnly((v) => !v); setPage(1); };

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ kind, page: String(page), sort });
    if (q.trim()) params.set("q", q.trim());
    if (stockOnly) params.set("stock", "1");

    // Debounce so typing does not fire a request per keystroke. setLoading
    // lives inside the timer so nothing sets state synchronously on mount.
    const t = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      fetch(`/api/catalog?${params}`)
        .then((r) => r.json())
        .then((d: { items: Product[]; total: number; pages: number }) => {
          if (cancelled) return;
          setItems(d.items);
          setTotal(d.total);
          setPages(d.pages);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => !cancelled && setLoading(false));
    }, q ? 220 : 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [kind, q, page, sort, stockOnly]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const backdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[60] bg-void/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onMouseDown={backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Choose ${KIND_LABEL[kind]}`}
    >
      <div className="panel-raised w-full max-w-5xl max-h-[92vh] md:max-h-[86vh] flex flex-col ticked">
        <header className="flex items-start justify-between gap-4 p-4 md:p-5 border-b border-[var(--line)]">
          <div className="min-w-0">
            <p className="t-eyebrow mb-1.5">Select · {total.toLocaleString()} available</p>
            <h2 className="t-display text-[22px] md:text-[26px]">{KIND_LABEL[kind]}</h2>
            <p className="text-[12.5px] text-ink-1 mt-1.5 leading-relaxed max-w-xl">{hint}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm shrink-0" aria-label="Close">
            Esc
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 p-3 md:px-5 border-b border-[var(--line)]">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => changeQ(e.target.value)}
            placeholder={`Search ${KIND_LABEL[kind].toLowerCase()}`}
            className="field flex-1 min-w-[12rem] h-9 text-[13px]"
            aria-label="Search parts"
          />
          <button
            onClick={toggleStock}
            className={`btn btn-sm ${stockOnly ? "btn-primary" : "btn-ghost"}`}
          >
            In stock
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-3 md:p-5">
          {loading && items.length === 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="panel h-24 animate-pulse opacity-40" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-[13.5px] text-ink-1 py-10 text-center">
              Nothing matches “{q}”. Try a shorter query — model numbers work better than full names.
            </p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {items.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onPick(p)}
                    className="panel-int w-full text-left flex gap-3 p-2.5 group"
                  >
                    <div className="w-20 shrink-0 border border-[var(--line)] bg-[var(--color-base)] self-start">
                      <PartArt product={p} className="w-full h-full" bare />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="t-label text-[9.5px]">{p.brand}</div>
                        <h3 className="text-[12.5px] font-medium leading-snug clamp-2 group-hover:text-acc transition-colors">
                          {p.model}
                        </h3>
                      </div>
                      <dl className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {keyStats(p).map(([k, v]) => (
                          <div key={k} className="flex gap-1 t-data text-[10.5px]">
                            <dt className="text-ink-3">{k}</dt>
                            <dd className="text-ink-1">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`pill ${p.condition !== "new" ? "pill-acc" : ""}`}>
                          {CONDITION_LABEL[p.condition]}
                        </span>
                        {p.avail.inHouse > 0 ? (
                          <span className="pill pill-ok">{p.avail.inHouse} held</span>
                        ) : (
                          <span className="pill">{p.avail.leadDays}d</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pages > 1 && (
          <footer className="flex items-center justify-between gap-3 p-3 md:px-5 border-t border-[var(--line)]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost btn-sm"
            >
              Previous
            </button>
            <span className="t-data text-[11.5px] text-ink-2">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="btn btn-ghost btn-sm"
            >
              Next
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
