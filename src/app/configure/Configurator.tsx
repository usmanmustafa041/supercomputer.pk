"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import PartArt from "@/components/art/PartArt";
import PartPicker from "./PartPicker";
import { Telemetry } from "./BuildViewport";
import { PRESETS, slotsFor, type Slot } from "./slots";
import { CONDITION_LABEL, fmtPkr, fmtPkrShort, type Kind, type Product } from "@/lib/catalog";
import { checkBuild } from "@/lib/compat/engine";
import { TARGET_LABEL, type BuildLine, type Finding, type Target } from "@/lib/compat/types";

/** three.js touches window on import, so the stage never renders on the server. */
const Stage = dynamic(() => import("./scene/Stage"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--rig-shell)]">
      <span className="t-data text-[11px] text-ink-3">loading viewport…</span>
    </div>
  ),
});

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
  const [target, setTarget] = useState<Target>(initialTarget);
  const [lines, setLines] = useState<BuildLine[]>(initialLines);
  const [picking, setPicking] = useState<Slot | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);
  const [dragKind, setDragKind] = useState<Kind | null>(null);

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
          preset.picks.map(([fam, qty]) => ({ product: byFamily.get(fam)!, qty })).filter((l) => l.product)
        );
      })
      .catch(() => {})
      .finally(() => setLoadingPreset(false));
  }, []);

  /** Dropping a slot tile into the scene opens the picker for that slot. */
  const onDropPart = useCallback(
    (kind: Kind) => {
      const slot = slots.find((s) => s.kind === kind);
      if (slot) setPicking(slot);
    },
    [slots]
  );

  const { summary, findings, errors, warns, buildable } = report;
  const hasLines = lines.length > 0;
  const errorIds = useMemo(
    () => [...new Set(findings.filter((f) => f.severity === "error").flatMap((f) => f.refs))],
    [findings]
  );

  return (
    <div className="shell py-6 md:py-9">
      <header className="mb-5">
        <p className="t-eyebrow mb-2">Configurator</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="t-display text-[clamp(1.7rem,4vw,2.7rem)]">Build it. We will check it.</h1>
          <div className="flex items-center gap-2">
            {(Object.keys(TARGET_LABEL) as Target[]).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`btn btn-sm ${target === t ? "btn-primary" : "btn-ghost"}`}
                aria-pressed={target === t}
              >
                {TARGET_LABEL[t].split(" ")[0]}
              </button>
            ))}
            {hasLines && (
              <button onClick={() => setLines([])} className="btn btn-ghost btn-sm">
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {!hasLines && (
        <section className="mb-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p.id)}
                disabled={loadingPreset}
                className="panel-int ticked text-left p-3.5 group disabled:opacity-50"
              >
                <span className="t-label text-[10px]">{TARGET_LABEL[p.target]}</span>
                <h3 className="text-[13.5px] font-medium mt-1 group-hover:text-acc transition-colors">{p.name}</h3>
                <p className="text-[11.5px] text-ink-1 mt-1.5 leading-relaxed clamp-2">{p.blurb}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid xl:grid-cols-[1fr_26rem] gap-5 items-start">
        {/* ----------------------------------------------------------- stage */}
        <div className="xl:sticky xl:top-24 space-y-4">
          <div className="panel-raised ticked overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
              <span className="t-label">3D viewport</span>
              <div className="flex items-center gap-2">
                {hasLines && (
                  <span className={`pill ${buildable ? "pill-ok" : "pill-err"}`}>
                    {buildable ? "buildable" : `${errors} blocking`}
                  </span>
                )}
                <span className="t-data text-[10px] text-ink-3">
                  {summary.rackU ? `${summary.rackU}U` : "tower"}
                </span>
              </div>
            </div>
            <div className="h-[52vh] xl:h-[62vh] min-h-[24rem]">
              <Stage
                lines={lines}
                dragKind={dragKind}
                onDropPart={onDropPart}
                onDragKind={setDragKind}
                errorIds={errorIds}
              />
            </div>
          </div>

          {/* telemetry strip under the stage */}
          <dl className="grid grid-cols-3 md:grid-cols-6 border-t border-l border-[var(--line)]">
            {([
              ["Peak", summary.power.peakW, "W", 0],
              ["At 230V", summary.power.amps230, "A", 1],
              ["Heat", summary.heatBtuHr, "BTU/hr", 0],
              ["Cores", summary.cores, "", 0],
              ["VRAM", summary.vramGb, "GB", 0],
              ["BF16", summary.bf16Tflops, "TF", 0],
            ] as Array<[string, number, string, number]>).map(([k, v, unit, dp]) => (
              <div key={k} className="border-r border-b border-[var(--line)] px-3 py-2.5 bg-[var(--color-surface)]">
                <dt className="t-data text-[9px] text-ink-3 uppercase tracking-[0.12em]">{k}</dt>
                <dd className="t-data text-[14px] mt-0.5">
                  {v ? <Telemetry value={v} unit={unit} decimals={dp} /> : <span className="text-ink-3">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ------------------------------------------------------- side rail */}
        <aside className="space-y-4">
          {/* parts */}
          <div className="panel">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
              <span className="t-label">Parts</span>
              <span className="t-data text-[10px] text-ink-3">drag into the case</span>
            </div>

            <div className="divide-y divide-[var(--line)] max-h-[46rem] overflow-y-auto">
              {slots.map((slot) => {
                const picked = byKind.get(slot.kind) ?? [];
                const flagged = picked.some((l) => errorIds.includes(l.product.id));

                return (
                  <section key={slot.kind}>
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-tf-kind", slot.kind);
                        e.dataTransfer.effectAllowed = "copy";
                        setDragKind(slot.kind);
                      }}
                      onDragEnd={() => setDragKind(null)}
                      className={`flex items-center justify-between gap-3 px-4 py-2 cursor-grab active:cursor-grabbing transition-colors ${
                        dragKind === slot.kind ? "bg-acc/10" : "hover:bg-[var(--wash-2)]"
                      }`}
                      title={`Drag ${slot.label.toLowerCase()} into the viewport`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="t-data text-[11px] text-ink-3 select-none" aria-hidden>
                          ⠿
                        </span>
                        <h2 className="text-[12.5px] font-medium">{slot.label}</h2>
                        {slot.core && picked.length === 0 && <span className="pill">required</span>}
                        {flagged && <span className="pill pill-err">conflict</span>}
                      </div>
                      <button onClick={() => setPicking(slot)} className="btn btn-ghost btn-sm shrink-0">
                        {picked.length ? "Add" : "Select"}
                      </button>
                    </div>

                    {picked.length > 0 && (
                      <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                        {picked.map((l) => {
                          const isFlagged = errorIds.includes(l.product.id);
                          return (
                            <li
                              key={l.product.id}
                              className={`flex gap-2.5 px-4 py-2.5 transition-colors ${
                                highlight.includes(l.product.id) ? "bg-acc/10" : ""
                              }`}
                            >
                              <div
                                className={`w-12 shrink-0 self-start border bg-[var(--color-base)] ${
                                  isFlagged ? "border-err/60" : "border-[var(--line)]"
                                }`}
                              >
                                <PartArt product={l.product} className="w-full h-full" bare />
                              </div>
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/product/${l.product.slug}`}
                                  className="text-[12px] font-medium hover:text-acc transition-colors leading-snug block clamp-2"
                                >
                                  {l.product.brand} {l.product.model}
                                </Link>
                                <span className="t-data text-[10px] text-ink-3">
                                  {CONDITION_LABEL[l.product.condition]}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="t-data text-[11.5px]">
                                  {l.product.price.onRequest ? "POA" : fmtPkr(l.product.price.pkr * l.qty)}
                                </span>
                                <div className="flex items-center border border-[var(--line-mid)]">
                                  <button
                                    onClick={() => setQty(l.product.id, l.qty - 1)}
                                    className="w-5 h-5 t-data text-[12px] text-ink-2 hover:text-ink hover:bg-[var(--wash)]"
                                    aria-label={`Decrease ${l.product.model}`}
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center t-data text-[11px]">{l.qty}</span>
                                  <button
                                    onClick={() => setQty(l.product.id, l.qty + 1)}
                                    className="w-5 h-5 t-data text-[12px] text-ink-2 hover:text-ink hover:bg-[var(--wash)]"
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

            <div className="p-4 border-t border-[var(--line)] space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-label">Total</span>
                <span key={summary.totalPkr} className="t-display text-[24px] tabular-nums pop">
                  {fmtPkrShort(summary.totalPkr)}
                </span>
              </div>
              <p className="t-data text-[10px] text-ink-3 leading-relaxed">
                Landed, duty and GST included.
                {summary.sourcedLines > 0 && ` ${summary.sourcedLines} line${summary.sourcedLines > 1 ? "s" : ""} to source.`}
              </p>
              <Link
                href={`/quote${encodeBuild(lines, target)}`}
                className={`btn w-full mt-1 ${buildable ? "btn-primary" : "btn-ghost"}`}
                aria-disabled={!hasLines}
              >
                {errors > 0 ? `Quote anyway (${errors} blocking)` : "Request a quote"}
              </Link>
            </div>
          </div>

          {/* validation */}
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
                        <span className={`pill ${st.pill}`}>{st.word}</span>
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
