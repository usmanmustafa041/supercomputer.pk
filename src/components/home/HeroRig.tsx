"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero object: a rack that assembles itself, tilts with the pointer and
 * reports live figures.
 *
 * Everything is CSS 3D transforms on flat elements — no WebGL, no model
 * loader, no extra bytes. Depth comes from stacked translateZ planes under a
 * shared perspective, which is enough to read as solid once it moves.
 */

const NODES = [
  { u: 5, label: "TF-8H100", gpus: 8, kw: 10.2, tone: "acc" },
  { u: 4, label: "TF-8L40S", gpus: 8, kw: 4.8, tone: "acc" },
  { u: 2, label: "TF-S24", gpus: 0, kw: 1.8, tone: "cool" },
  { u: 1, label: "QM8700", gpus: 0, kw: 0.7, tone: "cool" },
  { u: 4, label: "TF-4A100", gpus: 4, kw: 2.6, tone: "acc" },
  { u: 1, label: "TF-N2", gpus: 0, kw: 0.9, tone: "ink" },
  { u: 1, label: "TF-N2", gpus: 0, kw: 0.9, tone: "ink" },
  { u: 3, label: "SRT 10kVA", gpus: 0, kw: 0, tone: "ink" },
];

const TOTAL_KW = NODES.reduce((n, x) => n + x.kw, 0);
const TOTAL_GPU = NODES.reduce((n, x) => n + x.gpus, 0);
const TOTAL_U = NODES.reduce((n, x) => n + x.u, 0);

/** Stacking offsets, computed once at module load rather than during render. */
const LAYOUT = NODES.reduce<Array<{ top: number; height: number }>>((acc, n, i) => {
  const consumed = NODES.slice(0, i).reduce((s, x) => s + x.u, 0);
  acc.push({ top: (consumed / TOTAL_U) * 100, height: (n.u / TOTAL_U) * 100 });
  return acc;
}, []);

/** Counts to a target once, on mount. Purely decorative. */
function useCountUp(target: number, ms = 1100, decimals = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease-out-cubic
      setV(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v.toFixed(decimals);
}

export default function HeroRig() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  const kw = useCountUp(TOTAL_KW, 1300, 1);
  const gpu = useCountUp(TOTAL_GPU, 1000);
  const u = useCountUp(TOTAL_U, 1000);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Pointer parallax. Written straight to CSS custom properties so React
  // never re-renders on mouse move.
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
        el.style.setProperty("--ry", `${px * 26}deg`);
        el.style.setProperty("--rx", `${-py * 16}deg`);
        el.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
        el.style.setProperty("--my", `${(py + 0.5) * 100}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--ry", "-14deg");
      el.style.setProperty("--rx", "6deg");
    };

    onLeave();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="relative select-none">
      <div ref={stageRef} className="stage sheen-host relative" style={{ ["--ry" as string]: "-14deg", ["--rx" as string]: "6deg" }}>
        <div className="tilt relative mx-auto w-full max-w-[26rem] aspect-[3/4]">
          {/* floor shadow, sits behind everything */}
          <div
            className="absolute left-1/2 bottom-[6%] -translate-x-1/2 w-[78%] h-6 rounded-[50%] blur-xl opacity-60"
            style={{ background: "color-mix(in srgb, var(--color-acc) 22%, transparent)", transform: "translateZ(-40px)" }}
            aria-hidden
          />

          {/* rack shell */}
          <div
            className="absolute inset-0 border border-[var(--line-hi)] bg-[var(--color-base)]"
            style={{ transform: "translateZ(0px)" }}
          >
            <div className="absolute inset-0 grid-field opacity-70" aria-hidden />
            <div className="scanline" style={{ top: 0 }} aria-hidden />
          </div>

          {/* rack uprights, pushed forward so the nodes sit between them */}
          {[3, 97].map((x) => (
            <div
              key={x}
              className="absolute top-0 bottom-0 w-[3%] bg-[var(--color-raised)] border-x border-[var(--line-mid)]"
              style={{ left: `${x}%`, transform: "translateX(-50%) translateZ(46px)" }}
              aria-hidden
            />
          ))}

          {/* nodes */}
          <div className="absolute inset-y-[3%] inset-x-[7%]" style={{ transformStyle: "preserve-3d" }}>
            {NODES.map((n, i) => {
              const { top, height } = LAYOUT[i];
              const isActive = active === i;

              return (
                <div
                  key={i}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  className="absolute inset-x-0 border transition-[transform,border-color,background] duration-[400ms] cursor-default"
                  style={{
                    top: `${top}%`,
                    height: `calc(${height}% - 3px)`,
                    transform: `translateZ(${isActive ? 78 : 34}px) translateX(${isActive ? 10 : 0}px)`,
                    transitionDelay: mounted ? "0ms" : `${i * 70}ms`,
                    opacity: mounted ? 1 : 0,
                    borderColor: isActive
                      ? "var(--color-acc)"
                      : n.tone === "acc"
                        ? "color-mix(in srgb, var(--color-acc) 42%, var(--line-hi))"
                        : "var(--line-hi)",
                    background:
                      n.tone === "acc"
                        ? "linear-gradient(100deg, var(--color-overlay), var(--color-raised))"
                        : "var(--color-raised)",
                    boxShadow: isActive
                      ? "var(--lift-2)"
                      : n.tone === "acc"
                        ? "0 4px 20px -12px var(--color-acc)"
                        : "none",
                  }}
                >
                  {/* front-panel detail: accelerator bays or port cages */}
                  <div className="absolute inset-1.5 flex items-center gap-[3px] overflow-hidden">
                    {Array.from({ length: n.gpus ? 8 : 12 }).map((_, k) => (
                      <span
                        key={k}
                        className="flex-1 h-full min-h-[3px]"
                        style={{
                          background:
                            n.gpus && k < n.gpus
                              ? "color-mix(in srgb, var(--color-acc) 62%, transparent)"
                              : "var(--color-base)",
                          border: `1px solid ${n.gpus && k < n.gpus ? "var(--color-acc)" : "var(--line-mid)"}`,
                        }}
                      />
                    ))}
                  </div>

                  {/* status LED */}
                  <span
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full"
                    style={{ background: n.kw ? "var(--color-ok)" : "var(--color-ink-3)" }}
                  />

                  {/* callout on hover */}
                  {isActive && (
                    <div
                      className="pop absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap panel px-2.5 py-1.5 pointer-events-none"
                      style={{ transform: "translateZ(30px) translateY(-50%)" }}
                    >
                      <span className="t-data text-[10px] text-ink">{n.label}</span>
                      <span className="t-data text-[10px] text-ink-3 ml-2">
                        {n.u}U{n.gpus ? ` · ${n.gpus} GPU` : ""}
                        {n.kw ? ` · ${n.kw}kW` : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sheen" aria-hidden />
        </div>
      </div>

      {/* readout */}
      <dl className="mt-6 grid grid-cols-3 border-t border-l border-[var(--line)] max-w-[26rem] mx-auto">
        {[
          ["Rack", `${u}U`],
          ["Accelerators", gpu],
          ["Draw", `${kw}kW`],
        ].map(([k, v]) => (
          <div key={k} className="border-r border-b border-[var(--line)] px-3 py-2.5">
            <dt className="t-data text-[9px] text-ink-2 uppercase tracking-[0.14em]">{k}</dt>
            <dd className="t-data text-[17px] mt-0.5 tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
