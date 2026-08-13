"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * A three-switch miniature of the configurator. Swap a part, watch the
 * validation change. The rule text is lifted verbatim from the engine so
 * the demo cannot drift from what the real tool says.
 */

type Choice = 0 | 1;

const AXES = [
  {
    key: "chassis",
    label: "Chassis",
    options: ["4U server", "Desktop tower"],
  },
  {
    key: "gpu",
    label: "Accelerator",
    options: ["L40S 48GB", "RTX 5090 x4"],
  },
  {
    key: "psu",
    label: "Supply",
    options: ["3000W redundant", "850W ATX 3.0"],
  },
] as const;

interface Finding {
  sev: "error" | "warn" | "info" | "gain";
  title: string;
  detail: string;
  fix?: string;
}

const SEV = {
  error: { pill: "pill-err", bar: "bg-err", word: "Blocking" },
  warn: { pill: "pill-warn", bar: "bg-warn", word: "Warning" },
  info: { pill: "pill-cool", bar: "bg-cool", word: "Note" },
  gain: { pill: "pill-ok", bar: "bg-ok", word: "Opportunity" },
} as const;

function evaluate(chassis: Choice, gpu: Choice, psu: Choice): Finding[] {
  const out: Finding[] = [];
  const tower = chassis === 1;
  const consumer = gpu === 1;
  const smallPsu = psu === 1;

  if (tower && !consumer) {
    out.push({
      sev: "error",
      title: "L40S 48GB has no fans",
      detail:
        "Datacenter accelerators are passively cooled and rely on the chassis pushing air through the heatsink. In a tower the card hits its thermal limit within a minute.",
      fix: "Use a server chassis with front-to-back airflow, or an actively cooled card.",
    });
  }

  if (!tower && consumer) {
    out.push({
      sev: "error",
      title: "Cards need 12 rear slots, chassis has 11",
      detail:
        "Triple-slot coolers eat the neighbouring expansion positions even though they only use one PCIe connector.",
      fix: "Use blower or dual-slot cards.",
    });
  }

  if (consumer && smallPsu) {
    out.push({
      sev: "error",
      title: "4 cards need a 12VHPWR lead, supply provides 1",
      detail:
        "Running a 575W card off a four-way 8-pin adapter is the single most common cause of melted connectors.",
      fix: "Choose a supply with a native 12V-2x6 cable per card.",
    });
    out.push({
      sev: "error",
      title: "Power supply is 1,955W short",
      detail:
        "Peak draw is about 2,805W including GPU transients; installed capacity is 850W. The unit shuts down under load, usually mid-job.",
      fix: "Fit at least 3400W.",
    });
  }

  if (consumer && tower) {
    out.push({
      sev: "warn",
      title: "12.2A continuous on a single 230V circuit",
      detail:
        "A 16A Pakistani domestic circuit is rated 3.68kW, and continuous load should stay under about 2.9kW. This build will trip the breaker.",
      fix: "Run a dedicated 20A radial circuit.",
    });
  }

  if (!consumer) {
    out.push({
      sev: "info",
      title: "GDDR6 with ECC rather than HBM",
      detail: "Far cheaper per GB, at roughly a quarter of the memory bandwidth. Right for inference, wrong for large-batch training.",
    });
  }

  if (consumer) {
    out.push({
      sev: "warn",
      title: "Non-ECC memory on the accelerators",
      detail:
        "Consumer cards have no ECC on VRAM. A bit flip during a long run corrupts the result silently rather than raising an error.",
    });
  }

  if (!tower && !consumer && !smallPsu) {
    out.push({
      sev: "gain",
      title: "Four more cards would fit this chassis",
      detail: "The 4U takes eight double-width accelerators and the 3000W redundant supply already covers them.",
    });
  }

  return out;
}

export default function LiveCheck() {
  const [sel, setSel] = useState<[Choice, Choice, Choice]>([0, 0, 0]);
  const findings = useMemo(() => evaluate(sel[0], sel[1], sel[2]), [sel]);
  const errors = findings.filter((f) => f.sev === "error").length;

  return (
    <div className="panel-raised ticked overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--line)]">
        <span className="t-label">Live validation</span>
        <span className={`pill ${errors ? "pill-err" : "pill-ok"}`}>
          {errors ? `${errors} blocking` : "buildable"}
        </span>
      </div>

      {/* switches */}
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] border-b border-[var(--line)]">
        {AXES.map((axis, ai) => (
          <div key={axis.key} className="p-3">
            <span className="t-data text-[9px] text-ink-3 uppercase tracking-[0.14em]">{axis.label}</span>
            <div className="mt-2 flex border border-[var(--line-mid)]">
              {axis.options.map((opt, oi) => {
                const on = sel[ai] === oi;
                return (
                  <button
                    key={opt}
                    onClick={() =>
                      setSel((prev) => {
                        const next = [...prev] as [Choice, Choice, Choice];
                        next[ai] = oi as Choice;
                        return next;
                      })
                    }
                    aria-pressed={on}
                    className={`flex-1 px-2 py-1.5 t-data text-[10px] transition-colors ${
                      on ? "bg-acc text-[var(--color-acc-ink)]" : "text-ink-2 hover:text-ink hover:bg-[var(--wash)]"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-[var(--line)] min-h-[16rem]">
        {findings.map((f, i) => {
          const st = SEV[f.sev];
          return (
            <li
              key={`${f.title}-${i}`}
              className="p-3.5 flex gap-3 pop"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <span className={`w-1 shrink-0 self-stretch ${st.bar}`} aria-hidden />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`pill ${st.pill}`}>{st.word}</span>
                  <h3 className="text-[12.5px] font-medium">{f.title}</h3>
                </div>
                <p className="text-[12px] text-ink-1 mt-1.5 leading-relaxed">{f.detail}</p>
                {f.fix && <p className="text-[12px] text-cool mt-1.5 leading-relaxed">→ {f.fix}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="p-3 border-t border-[var(--line)]">
        <Link href="/configure" className="btn btn-primary btn-sm w-full">
          Open the full configurator
        </Link>
      </div>
    </div>
  );
}
