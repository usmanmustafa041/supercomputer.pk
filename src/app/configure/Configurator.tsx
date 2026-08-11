"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PartArt from "@/components/art/PartArt";
import PartPicker from "./PartPicker";
import BuildViewport, { Telemetry } from "./BuildViewport";
import { PRESETS, slotsFor, type Slot } from "./slots";
import { CONDITION_LABEL, fmtPkr, fmtPkrShort, type Kind, type Product } from "@/lib/catalog";
import { checkBuild } from "@/lib/compat/engine";
import { TARGET_LABEL, type BuildLine, type Finding, type Target } from "@/lib/compat/types";

const SEV_STYLE: Record<Finding["severity"], { pill: string; bar: string; word: string }> = {
  error: { pill: "pill-err", bar: "bg-err", word: "Blocking" },
  warn: { pill: "pill-warn", bar: "bg-warn", word: "Warning" },
  info: { pill: "pill-cool", bar: "bg-cool", word: "Note" },
  gain: { pill: "pill-ok", bar: "bg-ok", word: "Opportunity" },
};

/** Compact URL form: `T-ABC123*2` so a build survives a copy-paste. */
function encodeBuild(lines: BuildLine[], target: Target): string {
  const b = lines.map((l) => (l.qty > 1 ? `${l.product.id}*${l.qty}` : l.product.id)).join(",");
  return b ? `?t=${target}&b=${b}` : `?t=${target}`;
}

export default function Configurator({
  initialTarget,
  initialLines,
}: {
  initialTarget: Target;
  initialLines: BuildLine[];
}) {
  // Both come resolved from the server, so the first paint is already valid.
  const [target, setTarget] = useState<Target>(initialTarget);
  const [lines, setLines] = useState<BuildLine[]>(initialLines);
  const [picking, setPicking] = useState<Slot | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);

  // Keep the address bar in step without pushing a history entry per click.
  // Writing to the URL is an external-system sync, which is what effects are for.
  useEffect(() => {
    window.history.replaceState(null, "", `/configure${encodeBuild(lines, target)}`);
  }, [lines, target]);

  const report = useMemo(() => checkBuild({ lines, target }), [lines, target]);
  const slots = slotsFor(target);

  const byKind = useMemo(() => {
    const m = new Map<Kind, BuildLine[]>();
    for (const l of lines) {
      if (!m.has(l.product.kind)) m.set(l.product.kind, []);
      m.get(l.product.kind)!.push(l);
    }
    return m;
  }, [lines]);

  const add = useCallback((p: Product, qty: number) => {
    setLines((prev) => {
      const at = prev.findIndex((l) => l.product.id === p.id);
      if (at >= 0) {
        const next = [...prev];
        next[at] = { ...next[at], qty: next[at].qty + qty };
        return next;
      }
      return [...prev, { product: p, qty }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => (l.product.id === id ? { ...l, qty } : l))
    );
  }, []);

  const loadPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setTarget(preset.target);
    setLoadingPreset(true);
    fetch(`/api/catalog?families=${preset.picks.map(([f]) => f).join(",")}`)
      .then((r) => r.json())
      .then((d: { items: Product[] }) => {
        const byFamily = new Map(d.items.map((p) => [p.family, p]));
        setLines(
          preset.picks
            .map(([fam, qty]) => ({ product: byFamily.get(fam)!, qty }))
            .filter((l) => l.product)
        );
      })
      .catch(() => {})
      .finally(() => setLoadingPreset(false));
  }, []);

  const { summary, findings, errors, warns, buildable } = report;
  const hasLines = lines.length > 0;

  return (
    <div className="shell py-8 md:py-11">
      <header className="mb-7">
        <p className="t-eyebrow mb-2.5">Configurator</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">Build it. We will check it.</h1>
          {hasLines && (
            <button
              onClick={() => setLines([])}
              className="btn btn-ghost btn-sm"
            >
              Clear build
            </button>
          )}
        </div>
      </header>

      {/* deployment target — changes which rules apply */}
      <div className="flex flex-wrap items-center gap-2 pb-5 mb-6 border-b border-[var(--line)]">
        <span className="t-label mr-1">Deploying to</span>
        {(Object.keys(TARGET_LABEL) as Target[]).map((t) => (
          <button
            key={t}
            onClick={() => setTarget(t)}
            className={`btn btn-sm ${target === t ? "btn-primary" : "btn-ghost"}`}
            aria-pressed={target === t}
          >
            {TARGET_LABEL[t]}
          </button>
        ))}
      </div>

      {!hasLines && (
        <section className="mb-8">
          <h2 className="t-label mb-3">Start from a known-good configuration</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p.id)}
                disabled={loadingPreset}
                className="panel-int ticked text-left p-4 group disabled:opacity-50"
              >
                <span className="t-label text-[10px]">{TARGET_LABEL[p.target]}</span>
                <h3 className="text-[14px] font-medium mt-1.5 group-hover:text-acc transition-colors">{p.name}</h3>
                <p className="text-[12px] text-ink-1 mt-2 leading-relaxed">{p.blurb}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-[1fr_23rem] gap-6 items-start">
        {/* ------------------------------------------------------------ slots */}
        <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
          {slots.map((slot) => {
            const picked = byKind.get(slot.kind) ?? [];
            const flagged = findings.some(
              (f) => f.severity === "error" && picked.some((l) => f.refs.includes(l.product.id))
            );

            return (
              <section key={slot.kind} className="bg-[var(--color-surface)]">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <h2 className="text-[13px] font-medium">{slot.label}</h2>
                    {slot.core && picked.length === 0 && <span className="pill">required</span>}
                    {flagged && <span className="pill pill-err">conflict</span>}
                  </div>
                  <button onClick={() => setPicking(slot)} className="btn btn-ghost btn-sm shrink-0">
                    {picked.length ? "Add another" : "Select"}
                  </button>
                </div>

                {picked.length === 0 ? (
                  <p className="px-4 py-3.5 text-[12.5px] text-ink-2 leading-relaxed">{slot.hint}</p>
                ) : (
                  <ul className="divide-y divide-[var(--line)]">
                    {picked.map((l) => {
                      const isFlagged = findings.some(
                        (f) => f.severity === "error" && f.refs.includes(l.product.id)
                      );
                      return (
                        <li
                          key={l.product.id}
                          className={`flex gap-3 p-3 transition-colors ${
                            highlight.includes(l.product.id) ? "bg-acc/10" : ""
                          }`}
                        >
                          <div
                            className={`w-16 shrink-0 self-start border bg-[var(--color-base)] ${
                              isFlagged ? "border-err/50" : "border-[var(--line)]"
                            }`}
                          >
                            <PartArt product={l.product} className="w-full h-full" bare />
                          </div>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/product/${l.product.slug}`}
                              className="text-[12.5px] font-medium hover:text-acc transition-colors leading-snug block"
                            >
                              {l.product.brand} {l.product.model}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className={`pill ${l.product.condition !== "new" ? "pill-acc" : ""}`}>
                                {CONDITION_LABEL[l.product.condition]}
                              </span>
                              {l.product.avail.inHouse >= l.qty ? (
                                <span className="pill pill-ok">in stock</span>
                              ) : (
                                <span className="pill">{l.product.avail.leadDays}d lead</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="t-data text-[12.5px] tabular-nums">
                              {l.product.price.onRequest ? "POA" : fmtPkr(l.product.price.pkr * l.qty)}
                            </span>
                            <div className="flex items-center border border-[var(--line-mid)]">
                              <button
                                onClick={() => setQty(l.product.id, l.qty - 1)}
                                className="w-6 h-6 t-data text-[13px] text-ink-2 hover:text-ink hover:bg-[var(--wash)]"
                                aria-label={`Decrease ${l.product.model}`}
                              >
                                −
                              </button>
                              <span className="w-7 text-center t-data text-[12px] tabular-nums">{l.qty}</span>
                              <button
                                onClick={() => setQty(l.product.id, l.qty + 1)}
                                className="w-6 h-6 t-data text-[13px] text-ink-2 hover:text-ink hover:bg-[var(--wash)]"
                                aria-label={`Increase ${l.product.model}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {/* -------------------------------------------------------- side rail */}
        {/* The rail scrolls as a whole rather than capping the findings list —
            an inner max-height silently hid errors below the fold. */}
        <aside className="lg:sticky lg:top-28 space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto no-bar">
          <BuildViewport lines={lines} summary={summary} target={target} hasError={errors > 0} />

          {/* telemetry */}
          <div className="panel-raised ticked">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
              <span className="t-label">Build telemetry</span>
              {hasLines && (
                <span className={`pill ${buildable ? "pill-ok" : "pill-err"}`}>
                  {buildable ? "valid" : `${errors} blocking`}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 border-b border-[var(--line)]">
              {([
                ["At 230V", summary.power.amps230, "A", 1],
                ["Heat", summary.heatBtuHr, "BTU/hr", 0],
                ["Rack space", summary.rackU, "U", 0],
                ["Cores", summary.cores, "", 0],
                ["System RAM", summary.memGb, "GB", 0],
                ["VRAM", summary.vramGb, "GB", 0],
                ["BF16", summary.bf16Tflops, "TF", 0],
                ["Lines", lines.length, "", 0],
              ] as Array<[string, number, string, number]>).map(([k, v, unit, dp], i) => (
                <div key={k} className={`p-3 ${i % 2 === 0 ? "border-r" : ""} border-b border-[var(--line)]`}>
                  <dt className="t-data text-[9.5px] text-ink-3 uppercase tracking-wider">{k}</dt>
                  <dd className="t-data text-[15px] mt-1">
                    {v ? <Telemetry value={v} unit={unit} decimals={dp} /> : <span className="text-ink-3">—</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="p-4 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-label">Total</span>
                <span key={summary.totalPkr} className="t-display text-[26px] tabular-nums pop">
                  {fmtPkrShort(summary.totalPkr)}
                </span>
              </div>
              <p className="t-data text-[10.5px] text-ink-3 leading-relaxed">
                Landed in Pakistan, duty and GST included.
                {summary.sourcedLines > 0 &&
                  ` ${summary.sourcedLines} line${summary.sourcedLines > 1 ? "s" : ""} to source — up to ${summary.maxLeadDays} working days.`}
              </p>
              {summary.power.sustainedW > 0 && (
                <p className="t-data text-[10.5px] text-ink-3 leading-relaxed pt-2 border-t border-[var(--line)]">
                  Running cost ≈ {fmtPkrShort(summary.power.annualPkr)}/yr at 70% duty on a commercial tariff.
                </p>
              )}
              <Link
                href={`/quote${encodeBuild(lines, target)}`}
                className={`btn w-full mt-2 ${buildable ? "btn-primary" : "btn-ghost"}`}
                aria-disabled={!hasLines}
              >
                {errors > 0 ? `Quote anyway (${errors} blocking)` : "Request a quote"}
              </Link>
            </div>
          </div>

          {/* findings */}
          <div className="panel">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
              <span className="t-label">Validation</span>
              <span className="t-data text-[10.5px] text-ink-3">
                {findings.length === 0 ? "nothing to flag" : `${errors} error · ${warns} warn`}
              </span>
            </div>

            {!hasLines ? (
              <p className="p-4 text-[12.5px] text-ink-2 leading-relaxed">
                Checks run as you add parts. Socket and lane budgets, memory channel population, power connector
                counts, chassis clearance, rack depth, fabric coding and mains supply.
              </p>
            ) : findings.length === 0 ? (
              <p className="p-4 text-[12.5px] text-ok leading-relaxed">
                No conflicts found. Every check passed against the parts selected so far.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {findings.map((f, i) => {
                  const st = SEV_STYLE[f.severity];
                  return (
                    <li
                      key={`${f.rule}-${i}`}
                      className="p-3.5 flex gap-3 cursor-default pop hover:bg-[var(--wash-2)] transition-colors"
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                      onMouseEnter={() => setHighlight(f.refs)}
                      onMouseLeave={() => setHighlight([])}
                    >
                      <span className={`w-1 shrink-0 self-stretch ${st.bar}`} aria-hidden />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`pill ${st.pill}`}>{st.word}</span>
                        </div>
                        <h3 className="text-[12.5px] font-medium mt-1.5 leading-snug">{f.title}</h3>
                        <p className="text-[12px] text-ink-1 mt-1 leading-relaxed">{f.detail}</p>
                        {f.fix && <p className="text-[12px] text-cool mt-1.5 leading-relaxed">→ {f.fix}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {picking && (
        <PartPicker
          kind={picking.kind}
          hint={picking.hint}
          onClose={() => setPicking(null)}
          onPick={(p) => {
            add(p, picking.defaultQty);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
