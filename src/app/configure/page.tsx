import type { Metadata } from "next";
import Configurator from "./Configurator";
import { getById } from "@/lib/catalog";
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
  const initialLines: BuildLine[] = b
    .split(",")
    .filter(Boolean)
    .map((token) => {
      const [id, qty] = token.split("*");
      const product = getById(id);
      return product ? { product, qty: Math.max(1, Number(qty ?? 1)) } : null;
    })
    .filter((l): l is BuildLine => l !== null);

  return <Configurator initialTarget={t} initialLines={initialLines} />;
}
