"use client";

import { useEffect, useRef, useState } from "react";
import type { BuildLine, BuildSummary } from "@/lib/compat/types";
import type { Target } from "@/lib/compat/types";

/**
 * A pseudo-3D view of the machine being configured.
 *
 * It is not a render of the actual parts — it is a schematic that reacts to
 * what is in the build: the board appears when a board is chosen, GPU slots
 * fill as cards are added, the power rail lights when the supply covers peak,
 * the shell switches between tower and rack proportions with the target.
 *
 * CSS 3D transforms under one perspective. The point is legibility while you
 * work, not photorealism.
 */

interface Props {
  lines: BuildLine[];
  summary: BuildSummary;
  target: Target;
  hasError: boolean;
}

function count(lines: BuildLine[], kind: string): number {
  return lines.filter((l) => l.product.kind === kind).reduce((n, l) => n + l.qty, 0);
}

/**
 * Eases toward a target so telemetry slides rather than jumping.
 * The live value lives in a ref, so the effect depends only on the target and
 * does not need to lie to the exhaustive-deps rule.
 */
function useEased(target: number, ms = 420) {
  const [display, setDisplay] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = from + (target - from) * (1 - Math.pow(1 - t, 3));
      current.current = eased;
      setDisplay(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return display;
}

export function Telemetry({ value, unit, decimals = 0 }: { value: number; unit?: string; decimals?: number }) {
  const eased = useEased(value);
  return (
    <span className="tabular-nums">
      {eased.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {unit ? <span className="text-ink-3 ml-1">{unit}</span> : null}
    </span>
  );
}

export default function BuildViewport({ lines, summary, target, hasError }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);

  const gpus = count(lines, "gpu");
  const dimms = lines
    .filter((l) => l.product.kind === "memory")
    .reduce((n, l) => n + (l.product.kind === "memory" ? l.product.modules * l.qty : 0), 0);
  const drives = count(lines, "storage");
  const hasBoard = count(lines, "motherboard") > 0;
  const hasCpu = count(lines, "cpu") > 0;
  const hasChassis = count(lines, "chassis") > 0;
  const psuOk = summary.power.suppliedW > 0 && summary.power.suppliedW >= summary.power.peakW;

  const rack = target !== "desk";
  const loadPct = summary.power.suppliedW
    ? Math.min(100, (summary.power.peakW / summary.power.suppliedW) * 100)
    : 0;
  const easedLoad = useEased(loadPct, 600);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", `${px * 22}deg`);
        el.style.setProperty("--rx", `${-py * 14}deg`);
      });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--ry", "-10deg");
      el.style.setProperty("--rx", "8deg");
    };

    reset();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
    };
  }, []);

  const empty = lines.length === 0;

  return (
    <div className="panel-raised ticked overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
        <span className="t-label">Viewport</span>
        <span className="t-data text-[10px] text-ink-3">{rack ? `${summary.rackU || 0}U rack` : "tower"}</span>
      </div>

      <div
        ref={stageRef}
        className="stage relative px-6 py-7 bg-[var(--color-base)]"
        style={{ ["--ry" as string]: "-10deg", ["--rx" as string]: "8deg" }}
      >
        <div className="absolute inset-0 grid-field opacity-60" aria-hidden />

        <div
          className="tilt tilt-fast relative mx-auto"
          style={{ width: rack ? "100%" : "62%", aspectRatio: rack ? "5 / 3" : "3 / 4" }}
        >
          {/* shell */}
          <div
            className="absolute inset-0 border transition-colors duration-300"
            style={{
              borderColor: hasError ? "var(--color-err)" : hasChassis ? "var(--line-hi)" : "var(--line)",
              background: "var(--color-surface)",
              borderStyle: hasChassis ? "solid" : "dashed",
              boxShadow: hasChassis ? "var(--lift-2)" : "none",
            }}
          />

          {/* motherboard plane */}
          <div
            className="absolute transition-all duration-500"
            style={{
              inset: rack ? "12% 34% 12% 6%" : "8% 8% 34% 8%",
              transform: `translateZ(${hasBoard ? 22 : 0}px)`,
              opacity: hasBoard ? 1 : 0.16,
              background: "var(--art-pcb)",
              border: "1px solid var(--line-mid)",
            }}
          >
            {/* socket(s) */}
            <div
              className="absolute transition-all duration-500"
              style={{
                left: "8%",
                top: "10%",
                width: "34%",
                height: "34%",
                background: hasCpu ? "var(--art-fill-3)" : "transparent",
                border: `1px solid ${hasCpu ? "var(--line-hi)" : "var(--line)"}`,
                transform: `translateZ(${hasCpu ? 10 : 0}px)`,
              }}
            />
            {/* DIMM slots */}
            <div className="absolute right-[6%] top-[8%] bottom-[8%] w-[38%] flex gap-[2px] justify-end">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 transition-all duration-300"
                  style={{
                    background: i < dimms ? "var(--color-cool)" : "var(--wash)",
                    opacity: i < dimms ? 0.55 : 1,
                    transitionDelay: `${i * 24}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* accelerators — stacked planes lifting off the board */}
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {Array.from({ length: Math.min(8, gpus) }).map((_, i) => (
              <div
                key={i}
                className="absolute transition-all duration-500"
                style={{
                  left: rack ? "40%" : "12%",
                  right: rack ? "8%" : "12%",
                  top: rack ? `${14 + i * 9}%` : `${52 + i * 5.2}%`,
                  height: rack ? "7%" : "4%",
                  transform: `translateZ(${34 + i * 9}px)`,
                  transitionDelay: `${i * 55}ms`,
                  background: "linear-gradient(100deg, var(--color-raised), var(--color-surface))",
                  border: "1px solid var(--color-acc)",
                  boxShadow: "0 6px 18px -10px var(--color-acc)",
                }}
              >
                <span
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full"
                  style={{ background: "var(--color-ok)" }}
                />
              </div>
            ))}
          </div>

          {/* drive bays */}
          {drives > 0 && (
            <div
              className="absolute flex gap-[2px]"
              style={{
                left: rack ? "6%" : "10%",
                bottom: "4%",
                width: rack ? "26%" : "80%",
                height: "8%",
                transform: "translateZ(46px)",
              }}
            >
              {Array.from({ length: Math.min(10, drives) }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 border border-[var(--line-mid)] transition-opacity duration-300"
                  style={{ background: "var(--art-fill-2)", transitionDelay: `${i * 30}ms` }}
                />
              ))}
            </div>
          )}

          {/* power rail */}
          <div
            className="absolute left-0 right-0 bottom-0 h-[3px] overflow-hidden"
            style={{ transform: "translateZ(58px)", background: "var(--wash)" }}
          >
            <div
              className="h-full transition-[width] duration-500"
              style={{
                width: `${easedLoad}%`,
                background: !summary.power.suppliedW
                  ? "var(--color-ink-3)"
                  : psuOk
                    ? easedLoad > 80
                      ? "var(--color-warn)"
                      : "var(--color-ok)"
                    : "var(--color-err)",
              }}
            />
          </div>
        </div>

        {empty && (
          <p className="absolute inset-0 flex items-center justify-center text-[11.5px] text-ink-3 t-data pointer-events-none">
            select parts to populate
          </p>
        )}
      </div>

      {/* power readout */}
      <div className="grid grid-cols-3 border-t border-[var(--line)]">
        {[
          ["Peak", <Telemetry key="p" value={summary.power.peakW} unit="W" />],
          ["Supply", summary.power.suppliedW ? <Telemetry key="s" value={summary.power.suppliedW} unit="W" /> : "—"],
          ["Load", summary.power.suppliedW ? <Telemetry key="l" value={loadPct} unit="%" /> : "—"],
        ].map(([k, v], i) => (
          <div key={k as string} className={`px-3 py-2.5 ${i < 2 ? "border-r border-[var(--line)]" : ""}`}>
            <div className="t-data text-[9px] text-ink-3 uppercase tracking-[0.14em]">{k}</div>
            <div className="t-data text-[14px] mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
