import type { Metadata } from "next";
import Configurator from "./Configurator";
import { api } from "@/lib/api/client";
import type { Kind } from "@supercomputers/shared";
import { suggestChassis, suitsTarget } from "@supercomputers/shared";
import { SLOTS, presetsFromStatic, type PresetView } from "./slots";
import { presets as presetsApi } from "@/lib/api/resources";
import { getSession } from "@/lib/auth/session";
import type { BuildLine, Target } from "@supercomputers/shared";

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
  const requestedIds = b.split(",").filter(Boolean).map((token) => token.split("*")[0]).slice(0, 200);
  const catalog = requestedIds.length
    ? (await api<{ items: Array<import("@supercomputers/shared").Product> }>(`/catalog/by-ids?ids=${encodeURIComponent(requestedIds.join(","))}`)).items
    : [];
  const byId = new Map(catalog.map((product) => [product.id, product]));

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
      const product = byId.get(id);
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

  /**
   * The administrator owns these, so they come from the database. If it cannot
   * be reached the configurator still opens with the four built-in ones, which
   * matters more than the list being current: the configurator is the product,
   * and it should not go down because a menu of starting points did.
   */
  let presets: PresetView[];
  try {
    const rows = await presetsApi.list();
    presets = rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      role: r.role,
      target: r.target,
      blurb: r.blurb,
      picks: r.picks,
    }));
    if (presets.length === 0) presets = presetsFromStatic();
  } catch {
    presets = presetsFromStatic();
  }

  // Only decides whether the save control is drawn. The action behind it calls
  // requireAdmin() itself, which is the check that actually protects anything.
  let isAdmin = false;
  try {
    isAdmin = (await getSession())?.role === "admin";
  } catch {
    isAdmin = false;
  }

  return (
    <Configurator initialTarget={t} initialLines={initialLines} presets={presets} isAdmin={isAdmin} />
  );
}
