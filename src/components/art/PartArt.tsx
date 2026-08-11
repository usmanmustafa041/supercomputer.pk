/**
 * Procedural part imagery.
 *
 * 2,770 SKUs and no photo library. Hotlinking retailer photography is both
 * legally dubious and visually incoherent — you get four different lighting
 * setups in one grid. So every part is drawn instead, as a technical
 * elevation: same line weight, same palette, same camera, every time.
 *
 * Detail is derived from the SKU id, so a given card always renders the same
 * way on the server and in the browser. Nothing here is random at runtime.
 */

import type { Product } from "@/lib/catalog/types";

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic integer in [min,max] from a seed and a salt. */
function pick(seed: number, salt: number, min: number, max: number): number {
  const v = (seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  return min + (v % (max - min + 1));
}

/**
 * Quantises a computed coordinate.
 *
 * Math.cos and Math.sin can differ by one unit in the last place between
 * Node's V8 and the browser's, so the server serialises 65.07179676972449
 * where the client computes 65.0717967697245 — React reports that as a
 * hydration mismatch. Three decimals is far finer than a 200-unit viewBox can
 * show, and it makes both sides agree exactly.
 */
function q(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const INK = "var(--art-ink)";
const INK_HI = "var(--art-ink-hi)";
const ACC = "var(--color-acc)";
const COOL = "var(--color-cool)";

interface Props {
  product: Product;
  className?: string;
  /** Suppresses the label strip for tight grid cells. */
  bare?: boolean;
}

/* ------------------------------------------------------------ silhouettes */

function GpuArt({ p, s }: { p: Extract<Product, { kind: "gpu" }>; s: number }) {
  if (p.formFactor !== "pcie") {
    // SXM/OAM modules are a bare square board, no shroud, no bracket.
    return (
      <g>
        <rect x="52" y="30" width="96" height="90" fill="var(--art-fill)" stroke={INK} />
        <rect x="70" y="46" width="60" height="58" fill="var(--art-fill-2)" stroke={INK_HI} />
        <rect x="82" y="58" width="36" height="34" fill="var(--art-void)" stroke={ACC} strokeWidth="1.2" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={62 + i * 22} y="108" width="14" height="6" fill={INK} opacity="0.5" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={58} y={38 + i * 20} width="6" height="12" fill={COOL} opacity="0.35" />
        ))}
        <text x="100" y="136" fill={INK} fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
          {p.formFactor.toUpperCase()} MODULE
        </text>
      </g>
    );
  }

  const fans = p.lengthMm > 300 ? 3 : p.lengthMm > 240 ? 2 : 1;
  const w = Math.min(150, 62 + p.lengthMm * 0.26);
  const x0 = 100 - w / 2;
  const h = 22 + p.slotsWide * 9;
  const y0 = 76 - h / 2;
  const passive = p.cooling === "passive";

  return (
    <g>
      {/* bracket */}
      <rect x={x0 - 7} y={y0 - 6} width="7" height={h + 12} fill="var(--art-fill-2)" stroke={INK} />
      {Array.from({ length: Math.max(1, p.displayOutputs) }).map((_, i) => (
        <rect key={i} x={x0 - 6} y={y0 + 2 + i * ((h - 4) / Math.max(1, p.displayOutputs))} width="5" height="5" fill="var(--art-void)" stroke={INK} strokeWidth="0.6" />
      ))}

      {/* pcb */}
      <rect x={x0} y={y0 + 4} width={w} height={h - 4} fill="var(--art-fill)" stroke={INK} />
      {/* shroud */}
      <rect x={x0} y={y0} width={w} height={h - 8} fill="var(--art-fill-2)" stroke={INK_HI} />

      {passive ? (
        // fin stack rather than fans
        Array.from({ length: Math.floor(w / 5) }).map((_, i) => (
          <line key={i} x1={x0 + 4 + i * 5} y1={y0 + 3} x2={x0 + 4 + i * 5} y2={y0 + h - 11} stroke={INK} strokeWidth="0.7" opacity="0.7" />
        ))
      ) : (
        Array.from({ length: fans }).map((_, i) => {
          const r = Math.min(15, (w / fans - 6) / 2);
          const cx = x0 + (w / fans) * (i + 0.5);
          const cy = y0 + (h - 8) / 2;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="var(--art-void)" stroke={INK_HI} strokeWidth="0.8" />
              <circle cx={cx} cy={cy} r={r * 0.28} fill="var(--art-fill-3)" stroke={INK} strokeWidth="0.6" />
              {Array.from({ length: 7 }).map((_, k) => {
                const a = (k / 7) * Math.PI * 2 + pick(s, i, 0, 60) / 100;
                return (
                  <line
                    key={k}
                    x1={q(cx + Math.cos(a) * r * 0.32)}
                    y1={q(cy + Math.sin(a) * r * 0.32)}
                    x2={q(cx + Math.cos(a + 0.5) * r * 0.92)}
                    y2={q(cy + Math.sin(a + 0.5) * r * 0.92)}
                    stroke={INK}
                    strokeWidth="0.6"
                    opacity="0.85"
                  />
                );
              })}
            </g>
          );
        })
      )}

      {/* accent stripe — the one place colour is allowed */}
      <rect x={x0} y={y0 + h - 11} width={w} height="1.6" fill={p.eccVram ? COOL : ACC} opacity="0.85" />

      {/* pcie edge connector */}
      <rect x={x0 + 12} y={y0 + h - 4} width="30" height="5" fill="var(--art-gold)" opacity="0.55" />
      <rect x={x0 + 46} y={y0 + h - 4} width="62" height="5" fill="var(--art-gold)" opacity="0.55" />

      {/* power connectors */}
      {p.connectors.length > 0 && (
        <g>
          {p.connectors.slice(0, 3).map((c, i) => (
            <rect key={i} x={x0 + w - 34 + i * 11} y={y0 - 4} width="9" height="5" fill="var(--art-void)" stroke={c.startsWith("12v") ? ACC : INK_HI} strokeWidth="0.8" />
          ))}
        </g>
      )}
    </g>
  );
}

function CpuArt({ p, s }: { p: Extract<Product, { kind: "cpu" }>; s: number }) {
  // Server sockets get a big rectangular IHS; desktop gets the square one.
  const big = /SP5|SP3|LGA4677|LGA3647|sTR5|sWRX8|LGA2011/.test(p.socket);
  const w = big ? 108 : 62;
  const h = big ? 74 : 62;
  const x0 = 100 - w / 2;
  const y0 = 76 - h / 2;

  return (
    <g>
      <rect x={x0 - 4} y={y0 - 4} width={w + 8} height={h + 8} fill="var(--art-fill)" stroke={INK} />
      <rect x={x0} y={y0} width={w} height={h} rx="2" fill="var(--art-fill-3)" stroke={INK_HI} />
      <rect x={x0 + 6} y={y0 + 6} width={w - 12} height={h - 12} rx="1" fill="var(--art-fill-4)" stroke={INK} strokeWidth="0.7" />
      {/* notch corner marker — orientation triangle, always present on real parts */}
      <path d={`M ${x0 + 2} ${y0 + 10} L ${x0 + 2} ${y0 + 2} L ${x0 + 10} ${y0 + 2} Z`} fill={ACC} opacity="0.8" />
      {/* laser etch lines */}
      {[0, 1, 2].map((i) => (
        <line key={i} x1={x0 + 14} y1={y0 + h / 2 - 6 + i * 6} x2={x0 + w - 14} y2={y0 + h / 2 - 6 + i * 6} stroke={INK} strokeWidth="0.8" opacity={0.5 - i * 0.12} />
      ))}
      {/* substrate capacitors */}
      {Array.from({ length: big ? 10 : 6 }).map((_, i) => (
        <rect key={i} x={x0 - 3 + i * ((w + 6) / (big ? 10 : 6))} y={y0 + h + 1} width="4" height="2.5" fill={INK} opacity="0.6" />
      ))}
      <text x="100" y={y0 + h + 16} fill={INK} fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1.4">
        {p.socket.toUpperCase()}
      </text>
      {pick(s, 3, 0, 1) === 1 && <circle cx={x0 + w - 8} cy={y0 + h - 8} r="1.6" fill={COOL} opacity="0.6" />}
    </g>
  );
}

function DimmArt({ p }: { p: Extract<Product, { kind: "memory" }> }) {
  const n = Math.min(4, p.modules);
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const y = 76 - (n * 15) / 2 + i * 15;
        return (
          <g key={i}>
            <rect x="34" y={y} width="132" height="11" fill="var(--art-fill)" stroke={INK} />
            {/* heatspreader on desktop kits, bare PCB on server RDIMMs */}
            {p.heightMm > 34 ? (
              <rect x="34" y={y} width="132" height="7.5" fill="var(--art-fill-2)" stroke={INK_HI} strokeWidth="0.7" />
            ) : (
              Array.from({ length: 9 }).map((_, k) => (
                <rect key={k} x={40 + k * 14} y={y + 1.5} width="10" height="5" fill="var(--art-fill-3)" stroke={INK} strokeWidth="0.5" />
              ))
            )}
            {/* register chip — the visual difference between RDIMM and UDIMM */}
            {p.registered && <rect x="96" y={y + 1.5} width="9" height="5" fill="var(--art-fill-4)" stroke={ACC} strokeWidth="0.7" />}
            {/* keying notch */}
            <rect x={p.memGen === "ddr5" ? 96 : 86} y={y + 9} width="4" height="2.5" fill="var(--art-void)" />
            <rect x="34" y={y + 9} width="132" height="2.2" fill="var(--art-gold)" opacity="0.5" />
          </g>
        );
      })}
      {p.modules > 4 && (
        <text x="100" y="140" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.2">
          {p.modules} MODULE KIT
        </text>
      )}
    </g>
  );
}

function DriveArt({ p, s }: { p: Extract<Product, { kind: "storage" }>; s: number }) {
  if (p.bus === "m2-nvme") {
    const len = p.physical === "22110" ? 150 : 118;
    return (
      <g>
        <rect x={100 - len / 2} y="66" width={len} height="20" fill="var(--art-fill)" stroke={INK} />
        <rect x={100 - len / 2 + 8} y="70" width="30" height="12" fill="var(--art-fill-3)" stroke={INK_HI} strokeWidth="0.7" />
        <rect x={100 - len / 2 + 44} y="70" width="30" height="12" fill="var(--art-fill-3)" stroke={INK_HI} strokeWidth="0.7" />
        {p.powerLossProtection &&
          [0, 1, 2].map((i) => <rect key={i} x={100 - len / 2 + 80 + i * 9} y="72" width="6" height="8" fill="var(--art-fill-4)" stroke={ACC} strokeWidth="0.6" />)}
        <rect x={100 + len / 2 - 16} y="66" width="4" height="20" fill="var(--art-gold)" opacity="0.5" />
        <circle cx={100 - len / 2 + 4} cy="76" r="2.5" fill="none" stroke={INK} strokeWidth="0.8" />
        <text x="100" y="100" fill={INK} fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1.4">
          M.2 {p.physical}
        </text>
      </g>
    );
  }

  const hdd = p.media.startsWith("hdd");
  const w = hdd ? 118 : 96;
  const h = hdd ? 84 : 70;
  return (
    <g>
      <rect x={100 - w / 2} y={76 - h / 2} width={w} height={h} rx="1.5" fill="var(--art-fill-2)" stroke={INK_HI} />
      <rect x={100 - w / 2 + 6} y={76 - h / 2 + 6} width={w - 12} height={h - 12} fill="var(--art-fill)" stroke={INK} strokeWidth="0.7" />
      {hdd ? (
        <>
          <circle cx="100" cy="76" r={h / 3.4} fill="none" stroke={INK} strokeWidth="0.9" />
          <circle cx="100" cy="76" r="4" fill="var(--art-fill-3)" stroke={INK_HI} strokeWidth="0.7" />
          <path d={`M ${100 + w / 2 - 18} ${76 - h / 4} Q ${100 + 6} ${76 - 4} ${100 - 4} ${76 + 6}`} fill="none" stroke={INK_HI} strokeWidth="1.4" />
        </>
      ) : (
        Array.from({ length: 4 }).map((_, i) => (
          <rect key={i} x={100 - w / 2 + 14 + (i % 2) * 34} y={76 - h / 2 + 16 + Math.floor(i / 2) * 24} width="28" height="16" fill="var(--art-fill-3)" stroke={INK} strokeWidth="0.6" />
        ))
      )}
      {/* connector edge */}
      <rect x={100 - w / 2} y={76 + h / 2 - 14} width="4" height="24" fill={p.bus === "sata" ? "var(--art-fill-4)" : ACC} opacity="0.7" />
      <text x="100" y={76 + h / 2 + 16} fill={INK} fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1.4">
        {p.bus.toUpperCase()} · {p.physical}
      </text>
      {pick(s, 5, 0, 2) === 0 && <circle cx={100 + w / 2 - 8} cy={76 - h / 2 + 8} r="1.5" fill={COOL} opacity="0.5" />}
    </g>
  );
}

function BoardArt({ p, s }: { p: Extract<Product, { kind: "motherboard" }>; s: number }) {
  const wide = p.form === "eatx" || p.form === "ssi-eeb";
  const w = wide ? 152 : 128;
  const x0 = 100 - w / 2;
  return (
    <g>
      <rect x={x0} y="18" width={w} height="116" fill="var(--art-pcb)" stroke={INK} />
      {/* sockets */}
      {Array.from({ length: p.sockets }).map((_, i) => (
        <rect key={i} x={x0 + 14 + i * (w / 2 - 8)} y="26" width="34" height="30" fill="var(--art-fill-3)" stroke={INK_HI} strokeWidth="0.8" />
      ))}
      {/* DIMM slots */}
      {Array.from({ length: Math.min(12, p.memSlots) }).map((_, i) => (
        <rect key={i} x={x0 + w - 10 - i * ((w - 60) / Math.min(12, p.memSlots))} y="24" width="2.4" height="36" fill="var(--art-fill-3)" stroke={INK} strokeWidth="0.4" />
      ))}
      {/* PCIe slots, drawn at their real relative widths */}
      {p.pcieSlots.slice(0, 7).map((sl, i) => (
        <g key={i}>
          <rect x={x0 + 10} y={70 + i * 8.5} width={sl.width === 16 ? 78 : sl.width === 8 ? 46 : 24} height="4.5" fill="var(--art-fill-3)" stroke={sl.lanes < sl.width ? INK : INK_HI} strokeWidth="0.6" />
          {sl.gen >= 5 && <rect x={x0 + 10} y={70 + i * 8.5} width="3" height="4.5" fill={ACC} opacity="0.7" />}
        </g>
      ))}
      {/* M.2 */}
      {Array.from({ length: Math.min(5, p.m2Slots) }).map((_, i) => (
        <rect key={i} x={x0 + w - 46} y={72 + i * 11} width="38" height="5" fill="var(--art-fill-2)" stroke={INK} strokeWidth="0.5" />
      ))}
      {/* rear IO */}
      <rect x={x0} y="18" width="9" height="42" fill="var(--art-fill-2)" stroke={INK_HI} strokeWidth="0.7" />
      {p.ipmi && <circle cx={x0 + 4.5} cy="64" r="2.2" fill={COOL} opacity="0.65" />}
      {/* mounting holes */}
      {[[x0 + 4, 22], [x0 + w - 4, 22], [x0 + 4, 130], [x0 + w - 4, 130]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill="none" stroke={INK} strokeWidth="0.7" />
      ))}
      <text x="100" y="144" fill={INK} fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1.4">
        {p.form.toUpperCase()} · {p.socket.toUpperCase()}
      </text>
      {pick(s, 7, 0, 1) === 1 && <rect x={x0 + w - 20} y="26" width="12" height="10" fill="var(--art-fill-2)" stroke={INK} strokeWidth="0.5" />}
    </g>
  );
}

function PsuArt({ p }: { p: Extract<Product, { kind: "psu" }> }) {
  const redundant = p.redundancy > 1;
  return (
    <g>
      <rect x="42" y="36" width="116" height="80" rx="1.5" fill="var(--art-fill-2)" stroke={INK_HI} />
      {redundant ? (
        <>
          {[0, 1].map((i) => (
            <g key={i}>
              <rect x="46" y={40 + i * 38} width="108" height="34" fill="var(--art-fill)" stroke={INK} strokeWidth="0.7" />
              <circle cx="70" cy={57 + i * 38} r="11" fill="none" stroke={INK} strokeWidth="0.8" />
              {Array.from({ length: 6 }).map((_, k) => {
                const a = (k / 6) * Math.PI * 2;
                return <line key={k} x1={q(70 + Math.cos(a) * 4)} y1={q(57 + i * 38 + Math.sin(a) * 4)} x2={q(70 + Math.cos(a + 0.6) * 10)} y2={q(57 + i * 38 + Math.sin(a + 0.6) * 10)} stroke={INK} strokeWidth="0.6" />;
              })}
              <rect x="92" y={50 + i * 38} width="26" height="14" fill="var(--art-fill-3)" stroke={INK} strokeWidth="0.6" />
              <circle cx="140" cy={57 + i * 38} r="2" fill={i === 0 ? "var(--art-led)" : ACC} opacity="0.7" />
            </g>
          ))}
          <text x="100" y="128" fill={INK} fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1.4">
            {p.form.toUpperCase()} 1+1
          </text>
        </>
      ) : (
        <>
          <circle cx="100" cy="72" r="30" fill="none" stroke={INK} strokeWidth="0.9" />
          <circle cx="100" cy="72" r="7" fill="var(--art-fill-3)" stroke={INK_HI} strokeWidth="0.7" />
          {Array.from({ length: 9 }).map((_, k) => {
            const a = (k / 9) * Math.PI * 2;
            return <line key={k} x1={q(100 + Math.cos(a) * 8)} y1={q(72 + Math.sin(a) * 8)} x2={q(100 + Math.cos(a + 0.55) * 28)} y2={q(72 + Math.sin(a + 0.55) * 28)} stroke={INK} strokeWidth="0.7" opacity="0.9" />;
          })}
          <rect x="46" y="40" width="10" height="72" fill="var(--art-fill)" stroke={INK} strokeWidth="0.6" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x="48" y={44 + i * 11} width="6" height="7" fill="var(--art-fill-2)" stroke={INK} strokeWidth="0.4" />
          ))}
          <text x="100" y="128" fill={INK} fontSize="7" fontFamily="monospace" textAnchor="middle" letterSpacing="1.4">
            {p.form.toUpperCase()} · {p.efficiency.replace("80+ ", "").toUpperCase()}
          </text>
        </>
      )}
      <text x="100" y="26" fill={ACC} fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="600" letterSpacing="0.5">
        {p.wattage}W
      </text>
    </g>
  );
}

function ChassisArt({ p }: { p: Extract<Product, { kind: "chassis" }> }) {
  const rack = p.rackU > 0;
  if (rack) {
    const h = Math.min(96, 16 + p.rackU * 15);
    return (
      <g>
        <rect x="26" y={76 - h / 2} width="148" height={h} fill="var(--art-fill-2)" stroke={INK_HI} />
        {/* rack ears */}
        <rect x="20" y={76 - h / 2} width="6" height={h} fill="var(--art-fill)" stroke={INK} strokeWidth="0.7" />
        <rect x="174" y={76 - h / 2} width="6" height={h} fill="var(--art-fill)" stroke={INK} strokeWidth="0.7" />
        {/* drive bays */}
        {p.hotSwapBays > 0 &&
          Array.from({ length: Math.min(24, p.hotSwapBays) }).map((_, i) => {
            const cols = Math.min(12, p.hotSwapBays);
            const rows = Math.ceil(Math.min(24, p.hotSwapBays) / cols);
            const bw = 130 / cols;
            const bh = Math.min(20, (h - 14) / rows);
            return (
              <rect
                key={i}
                x={32 + (i % cols) * bw}
                y={76 - h / 2 + 7 + Math.floor(i / cols) * bh}
                width={bw - 1.6}
                height={bh - 1.6}
                fill="var(--art-void)"
                stroke={INK}
                strokeWidth="0.5"
              />
            );
          })}
        {p.forcedAirflow &&
          [0, 1, 2].map((i) => (
            <path key={i} d={`M ${150} ${76 - 8 + i * 8} l 12 0 m -3 -3 l 3 3 l -3 3`} fill="none" stroke={COOL} strokeWidth="0.9" opacity="0.55" />
          ))}
        <circle cx="168" cy={76 - h / 2 + 6} r="1.8" fill="var(--art-led)" opacity="0.7" />
        <text x="100" y={76 + h / 2 + 14} fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.6">
          {p.rackU}U · {p.depthMm}MM DEEP
        </text>
      </g>
    );
  }

  const open = p.form === "open-frame";
  return (
    <g>
      {open ? (
        <>
          {[0, 1].map((i) => (
            <line key={i} x1="46" y1={38 + i * 68} x2="154" y2={38 + i * 68} stroke={INK_HI} strokeWidth="1.6" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={46 + i * 36} y1="38" x2={46 + i * 36} y2="106" stroke={INK} strokeWidth="1.1" />
          ))}
          {Array.from({ length: Math.min(6, p.maxGpus) }).map((_, i) => (
            <rect key={i} x={50} y={44 + i * 10} width="100" height="6" fill="var(--art-fill-2)" stroke={INK} strokeWidth="0.5" />
          ))}
        </>
      ) : (
        <>
          <rect x="56" y="18" width="88" height="116" fill="var(--art-fill-2)" stroke={INK_HI} />
          <rect x="60" y="22" width="46" height="108" fill="var(--art-void)" stroke={INK} strokeWidth="0.6" />
          {/* front mesh */}
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1="62" y1={26 + i * 7.4} x2="104" y2={26 + i * 7.4} stroke={INK} strokeWidth="0.5" opacity="0.6" />
          ))}
          {/* side window */}
          <rect x="110" y="26" width="30" height="100" fill="var(--art-glass)" stroke={INK} strokeWidth="0.6" opacity="0.8" />
          <rect x="114" y="60" width="22" height="9" fill="var(--art-fill-2)" stroke={ACC} strokeWidth="0.6" opacity="0.7" />
          <circle cx="83" cy="128" r="1.8" fill="var(--art-led)" opacity="0.7" />
        </>
      )}
      <text x="100" y="146" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.6">
        {p.form.replace("-", " ").toUpperCase()}
      </text>
    </g>
  );
}

function NetArt({ p }: { p: Extract<Product, { kind: "nic" | "switch" }> }) {
  const isSwitch = p.kind === "switch";
  const ports = isSwitch ? Math.min(32, p.ports) : Math.min(4, p.ports);
  return (
    <g>
      {isSwitch ? (
        <>
          <rect x="22" y="52" width="156" height="48" fill="var(--art-fill-2)" stroke={INK_HI} />
          <rect x="16" y="52" width="6" height="48" fill="var(--art-fill)" stroke={INK} strokeWidth="0.6" />
          <rect x="178" y="52" width="6" height="48" fill="var(--art-fill)" stroke={INK} strokeWidth="0.6" />
          {Array.from({ length: ports }).map((_, i) => {
            const cols = Math.ceil(ports / 2);
            return (
              <rect
                key={i}
                x={28 + (i % cols) * (142 / cols)}
                y={58 + Math.floor(i / cols) * 18}
                width={142 / cols - 2}
                height="14"
                fill="var(--art-void)"
                stroke={INK}
                strokeWidth="0.5"
              />
            );
          })}
          <circle cx="172" cy="58" r="1.6" fill="var(--art-led)" opacity="0.8" />
          <text x="100" y="114" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
            {p.ports}x {p.portGbps}G {p.portType.toUpperCase()}
          </text>
        </>
      ) : (
        <>
          <rect x="40" y="54" width="120" height="44" fill="var(--art-pcb)" stroke={INK} />
          <rect x="34" y="44" width="8" height="64" fill="var(--art-fill-2)" stroke={INK} strokeWidth="0.7" />
          {Array.from({ length: ports }).map((_, i) => (
            <rect key={i} x="42" y={58 + i * (36 / ports)} width="14" height={36 / ports - 3} fill="var(--art-void)" stroke={INK_HI} strokeWidth="0.6" />
          ))}
          {/* ASIC under a heatsink */}
          <rect x="76" y="62" width="40" height="28" fill="var(--art-fill-3)" stroke={INK_HI} strokeWidth="0.8" />
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={79 + i * 4.6} y1="64" x2={79 + i * 4.6} y2="88" stroke={INK} strokeWidth="0.6" />
          ))}
          <rect x="124" y="94" width={p.pcieWidth === 16 ? 34 : 20} height="4" fill="var(--art-gold)" opacity="0.55" />
          {p.gpuDirect && <circle cx="150" cy="60" r="2" fill={ACC} opacity="0.8" />}
          <text x="100" y="114" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
            {p.portGbps}G {p.portType.toUpperCase()} · x{p.pcieWidth}
          </text>
        </>
      )}
    </g>
  );
}

function CoolerArt({ p }: { p: Extract<Product, { kind: "cooler" }> }) {
  if (p.type === "aio") {
    return (
      <g>
        <rect x="30" y="46" width="104" height="34" rx="2" fill="var(--art-fill-2)" stroke={INK_HI} />
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={i} x1={33 + i * 5} y1="48" x2={33 + i * 5} y2="78" stroke={INK} strokeWidth="0.6" opacity="0.7" />
        ))}
        <path d="M 134 58 Q 158 58 158 82 Q 158 100 142 100" fill="none" stroke={INK} strokeWidth="2.4" />
        <path d="M 134 70 Q 150 70 150 86 Q 150 96 142 96" fill="none" stroke={INK} strokeWidth="2.4" />
        <rect x="118" y="92" width="34" height="26" rx="2" fill="var(--art-fill-3)" stroke={INK_HI} />
        <circle cx="135" cy="105" r="7" fill="none" stroke={ACC} strokeWidth="1" opacity="0.8" />
        <text x="100" y="134" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
          {p.radiatorMm}MM AIO · {p.tdpRatingW}W
        </text>
      </g>
    );
  }
  const tall = p.heightMm > 100;
  const h = tall ? 92 : 34;
  return (
    <g>
      <rect x="62" y={110 - h} width="76" height={h} fill="var(--art-fill-2)" stroke={INK_HI} />
      {Array.from({ length: Math.floor(h / 4) }).map((_, i) => (
        <line key={i} x1="64" y1={112 - h + i * 4} x2="136" y2={112 - h + i * 4} stroke={INK} strokeWidth="0.5" opacity="0.75" />
      ))}
      {p.type.startsWith("air") && !p.needsChassisAirflow && (
        <g>
          <circle cx="100" cy={110 - h / 2} r={Math.min(26, h / 2 - 4)} fill="none" stroke={INK_HI} strokeWidth="0.9" opacity="0.9" />
          {Array.from({ length: 7 }).map((_, k) => {
            const a = (k / 7) * Math.PI * 2;
            const r = Math.min(26, h / 2 - 4);
            return <line key={k} x1={q(100 + Math.cos(a) * 5)} y1={q(110 - h / 2 + Math.sin(a) * 5)} x2={q(100 + Math.cos(a + 0.5) * r * 0.9)} y2={q(110 - h / 2 + Math.sin(a + 0.5) * r * 0.9)} stroke={INK} strokeWidth="0.6" />;
          })}
        </g>
      )}
      <rect x="82" y="110" width="36" height="6" fill="var(--art-copper)" opacity="0.6" />
      {/* heatpipes */}
      {tall && [0, 1, 2].map((i) => (
        <line key={i} x1={78 + i * 15} y1="110" x2={78 + i * 15} y2={116 - h} stroke="var(--art-copper)" strokeWidth="2.2" opacity="0.55" />
      ))}
      <text x="100" y="132" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
        {p.heightMm}MM · {p.tdpRatingW}W
      </text>
    </g>
  );
}

function RackArt({ p }: { p: Extract<Product, { kind: "rack" }> }) {
  const rows = Math.min(20, Math.round(p.heightU / 2.2));
  return (
    <g>
      <rect x="58" y="14" width="84" height="124" fill="var(--art-fill)" stroke={INK_HI} />
      <rect x="62" y="18" width="76" height="116" fill="var(--art-void)" stroke={INK} strokeWidth="0.6" />
      {Array.from({ length: rows }).map((_, i) => (
        <line key={i} x1="64" y1={20 + i * (112 / rows)} x2="136" y2={20 + i * (112 / rows)} stroke={INK} strokeWidth="0.5" opacity="0.55" />
      ))}
      {/* mounting rail holes */}
      {Array.from({ length: rows }).map((_, i) => (
        <g key={i}>
          <rect x="63" y={22 + i * (112 / rows)} width="2" height="2" fill={INK} opacity="0.7" />
          <rect x="135" y={22 + i * (112 / rows)} width="2" height="2" fill={INK} opacity="0.7" />
        </g>
      ))}
      <rect x="140" y="20" width="4" height="112" fill="var(--art-fill-2)" stroke={INK} strokeWidth="0.5" />
      <text x="100" y="150" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.6">
        {p.heightU}U · {p.depthMm}MM
      </text>
    </g>
  );
}

function PowerBoxArt({ p }: { p: Extract<Product, { kind: "pdu" | "ups" }> }) {
  const isUps = p.kind === "ups";
  const outlets = Math.min(12, p.outlets);
  return (
    <g>
      <rect x="24" y={isUps ? 48 : 58} width="152" height={isUps ? 56 : 34} fill="var(--art-fill-2)" stroke={INK_HI} />
      {isUps && (
        <>
          <rect x="30" y="54" width="46" height="44" fill="var(--art-void)" stroke={INK} strokeWidth="0.6" />
          <rect x="34" y="62" width="38" height="14" fill="var(--art-glass)" stroke={COOL} strokeWidth="0.6" opacity="0.6" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={34 + i * 10} y="82" width="6" height="10" fill="var(--art-fill-3)" stroke={INK} strokeWidth="0.4" />
          ))}
        </>
      )}
      {Array.from({ length: outlets }).map((_, i) => (
        <rect
          key={i}
          x={(isUps ? 84 : 30) + i * ((isUps ? 86 : 140) / outlets)}
          y={isUps ? 66 : 66}
          width={(isUps ? 86 : 140) / outlets - 2.5}
          height="18"
          fill="var(--art-void)"
          stroke={INK}
          strokeWidth="0.5"
        />
      ))}
      <circle cx="168" cy={isUps ? 54 : 64} r="1.8" fill="var(--art-led)" opacity="0.8" />
      <text x="100" y={isUps ? 120 : 106} fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
        {isUps ? `${(p as Extract<Product, { kind: "ups" }>).vaRating / 1000}KVA · ${p.rackU}U` : `${p.outlets} OUTLET · ${(p as Extract<Product, { kind: "pdu" }>).maxKw}KW`}
      </text>
    </g>
  );
}

function OpticArt({ p }: { p: Extract<Product, { kind: "optic" }> }) {
  const cable = p.lengthM > 0;
  return (
    <g>
      {cable ? (
        <>
          <rect x="24" y="64" width="34" height="20" rx="1.5" fill="var(--art-fill-3)" stroke={INK_HI} />
          <rect x="142" y="64" width="34" height="20" rx="1.5" fill="var(--art-fill-3)" stroke={INK_HI} />
          <rect x="28" y="68" width="8" height="12" fill="var(--art-void)" stroke={INK} strokeWidth="0.5" />
          <rect x="164" y="68" width="8" height="12" fill="var(--art-void)" stroke={INK} strokeWidth="0.5" />
          <path d="M 58 74 C 84 46, 116 102, 142 74" fill="none" stroke={p.media.startsWith("dac") ? INK_HI : COOL} strokeWidth={p.media.startsWith("dac") ? 5 : 2.4} opacity="0.75" strokeLinecap="round" />
          <text x="100" y="106" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
            {p.lengthM}M {p.media.toUpperCase()} · {p.gbps}G
          </text>
        </>
      ) : (
        <>
          <rect x="52" y="58" width="96" height="32" rx="1.5" fill="var(--art-fill-3)" stroke={INK_HI} />
          <rect x="56" y="62" width="14" height="24" fill="var(--art-void)" stroke={INK} strokeWidth="0.5" />
          <rect x="128" y="66" width="18" height="7" fill="var(--art-glass)" stroke={COOL} strokeWidth="0.6" opacity="0.7" />
          <rect x="128" y="76" width="18" height="7" fill="var(--art-glass)" stroke={COOL} strokeWidth="0.6" opacity="0.7" />
          <path d="M 74 74 l 46 0" stroke={INK} strokeWidth="0.8" strokeDasharray="3 2" />
          <text x="100" y="106" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5">
            {p.portType.toUpperCase()} {p.media.toUpperCase()} · {p.reachM}M
          </text>
        </>
      )}
    </g>
  );
}

function SystemArt({ p }: { p: Extract<Product, { kind: "system" }> }) {
  const tower = p.rackU === 0;
  if (tower) {
    return (
      <g>
        <rect x="56" y="16" width="88" height="120" fill="var(--art-fill-2)" stroke={INK_HI} />
        <rect x="60" y="20" width="80" height="112" fill="var(--art-void)" stroke={INK} strokeWidth="0.6" />
        {Array.from({ length: Math.min(4, p.gpuCount) }).map((_, i) => (
          <rect key={i} x="66" y={72 + i * 13} width="68" height="9" fill="var(--art-fill-2)" stroke={ACC} strokeWidth="0.6" opacity="0.85" />
        ))}
        <rect x="66" y="28" width="30" height="26" fill="var(--art-fill-3)" stroke={INK_HI} strokeWidth="0.7" />
        {Array.from({ length: 4 }).map((_, i) => (
          <rect key={i} x={102 + i * 8} y="28" width="5" height="26" fill="var(--art-fill-3)" stroke={INK} strokeWidth="0.4" />
        ))}
        <circle cx="72" cy="128" r="2" fill="var(--art-led)" opacity="0.8" />
        <text x="100" y="148" fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.6">
          {p.gpuCount ? `${p.gpuCount}x GPU` : `${p.coresTotal} CORES`}
        </text>
      </g>
    );
  }

  const nodes = Math.min(8, p.nodes);
  const h = Math.min(18, 110 / nodes);
  return (
    <g>
      {Array.from({ length: nodes }).map((_, i) => (
        <g key={i}>
          <rect x="26" y={20 + i * (h + 3)} width="148" height={h} fill="var(--art-fill-2)" stroke={INK_HI} strokeWidth="0.8" />
          {Array.from({ length: 10 }).map((_, k) => (
            <rect key={k} x={32 + k * 14} y={22 + i * (h + 3)} width="11" height={h - 4} fill="var(--art-void)" stroke={INK} strokeWidth="0.4" />
          ))}
          <circle cx="168" cy={20 + i * (h + 3) + h / 2} r="1.5" fill="var(--art-led)" opacity="0.75" />
        </g>
      ))}
      <text x="100" y={20 + nodes * (h + 3) + 14} fill={INK} fontSize="7.5" fontFamily="monospace" textAnchor="middle" letterSpacing="1.6">
        {p.nodes > 1 ? `${p.nodes} NODES · ${p.rackU}U` : `${p.rackU}U · ${p.gpuCount ? `${p.gpuCount}x GPU` : `${p.coresTotal} CORES`}`}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ shell */

export default function PartArt({ product: p, className = "", bare = false }: Props) {
  const s = hash(p.id);

  let body: React.ReactNode = null;
  switch (p.kind) {
    case "gpu": body = <GpuArt p={p} s={s} />; break;
    case "cpu": body = <CpuArt p={p} s={s} />; break;
    case "memory": body = <DimmArt p={p} />; break;
    case "storage": body = <DriveArt p={p} s={s} />; break;
    case "motherboard": body = <BoardArt p={p} s={s} />; break;
    case "psu": body = <PsuArt p={p} />; break;
    case "chassis": body = <ChassisArt p={p} />; break;
    case "cooler": body = <CoolerArt p={p} />; break;
    case "nic":
    case "switch": body = <NetArt p={p} />; break;
    case "optic": body = <OpticArt p={p} />; break;
    case "rack": body = <RackArt p={p} />; break;
    case "pdu":
    case "ups": body = <PowerBoxArt p={p} />; break;
    case "system": body = <SystemArt p={p} />; break;
  }

  return (
    <svg
      viewBox="0 0 200 152"
      className={className}
      role="img"
      aria-label={`Technical illustration of ${p.brand} ${p.model}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={`g-${p.id}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--grid-ink)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="152" fill={`url(#g-${p.id})`} />
      {!bare && (
        <>
          {/* dimension ticks, like a parts drawing */}
          <line x1="8" y1="10" x2="8" y2="20" stroke="var(--line-hi)" strokeWidth="0.7" />
          <line x1="8" y1="10" x2="18" y2="10" stroke="var(--line-hi)" strokeWidth="0.7" />
          <line x1="192" y1="142" x2="192" y2="132" stroke="var(--line-hi)" strokeWidth="0.7" />
          <line x1="192" y1="142" x2="182" y2="142" stroke="var(--line-hi)" strokeWidth="0.7" />
        </>
      )}
      {body}
    </svg>
  );
}
