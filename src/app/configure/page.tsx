import type { Metadata } from "next";
import Configurator from "./Configurator";
import { getById } from "@/lib/catalog";
import type { Kind } from "@/lib/catalog";
import { suggestChassis, suitsTarget } from "@/lib/catalog/fit";
import { SLOTS } from "./slots";
import type { BuildLine, Target } from "@/lib/compat/types";

export const metadata: Metadata = {
  title: "Configurator",
  description:
    "Build a workstation, rack node or cluster and have every socket, lane, power, thermal and rack constraint checked as you go.",
};

export default async function ConfigurePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const t = typeof sp.t === "string" && ["desk", "rack", "cluster"].includes(sp.t) ? (sp.t as Target) : "desk";

  // Resolve a shared build server-side. Doing it here rather than in a mount
  // effect means the configuration renders validated on first paint, with no
  // empty-then-populated flash and no round trip.
  const b = typeof sp.b === "string" ? sp.b : "";

  /**
   * Quantities are clamped here as well as in the configurator. The caps used
   * to live only in the click handlers, so a URL carrying `*12` on a
   * motherboard rehydrated a build no node could ever be, and the viewport
   * quietly drew one board while the list claimed twelve.
   */
  const seen = new Map<Kind, number>();
  let initialLines: BuildLine[] = b
    .split(",")
    .filter(Boolean)
    .map((token) => {
      const [id, qty] = token.split("*");
      const product = getById(id);
      if (!product) return null;
      const cap = SLOTS.find((s) => s.kind === product.kind)?.maxPerNode ?? 99;
      const used = seen.get(product.kind) ?? 0;
      const room = Math.max(0, cap - used);
      if (room === 0) return null;
      const want = Math.max(1, Number(qty ?? 1));
      const granted = Math.min(want, room);
      seen.set(product.kind, used + granted);
      return { product, qty: granted };
    })
    .filter((l): l is BuildLine => l !== null);

  /**
   * Re-home on load too, not only when the target buttons are clicked. A
   * shared link carrying `t=cluster` with a tower chassis would otherwise open
   * permanently mismatched, and the same applies to the presets.
   */
  const chassisLine = initialLines.find((l) => l.product.kind === "chassis");
  if (chassisLine && chassisLine.product.kind === "chassis" && !suitsTarget(chassisLine.product, t)) {
    const hit = suggestChassis(initialLines, t);
    if (hit) {
      initialLines = initialLines.map((l) =>
        l.product.id === chassisLine.product.id ? { product: hit.chassis, qty: 1 } : l
      );
    }
  }

  return <Configurator initialTarget={t} initialLines={initialLines} />;
}
