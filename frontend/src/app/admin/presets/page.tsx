import Link from "next/link";
import { presets as presetsApi } from "@/lib/api/resources";
import { TARGET_LABEL } from "@supercomputers/shared";
import { reorderPreset, togglePreset } from "./actions";

export const metadata = { title: "Pre-built configurations" };

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  // Retired ones included, because this is where they are brought back.
  const presets = await presetsApi.adminList();

  return (
    <div className="shell py-6 sm:py-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="t-display text-xl sm:text-2xl">Pre-built configurations</h1>
        <span className="t-data text-[12px] text-ink-3">{presets.length} in the list</span>
      </div>
      <p className="text-[13px] text-ink-2 leading-relaxed max-w-prose mb-6">
        These are the starting points offered in the configurator, in this order. To add a new one, put it
        together in the configurator, check it passes, and save it from there. Everything on this page is about
        how it is presented.
      </p>

      {saved && (
        <p className="panel p-3 mb-5 text-[13px] border-[color-mix(in_srgb,var(--color-acc)_30%,var(--line))]">
          Saved. The configurator is showing the change now.
        </p>
      )}

      {presets.length === 0 ? (
        <div className="panel p-6 text-center">
          <p className="text-[14px] mb-1">Nothing here yet.</p>
          <p className="text-[13px] text-ink-2 mb-4">
            Put a configuration together in the configurator and save it from there.
          </p>
          <Link href="/configure" className="btn btn-primary">
            Open the configurator
          </Link>
        </div>
      ) : (
        <ul className="grid gap-2">
          {presets.map((p, i) => (
            <li
              key={p.slug}
              className={`panel p-3.5 sm:p-4 grid gap-3 ${p.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                <span className="t-data text-[11px] text-ink-3 mt-1 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="t-label text-[9.5px]">{p.role || TARGET_LABEL[p.target]}</p>
                  <h2 className="text-[15px] font-medium mt-0.5">{p.name}</h2>
                  <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed clamp-2">{p.blurb}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="pill">{TARGET_LABEL[p.target].split(" ")[0]}</span>
                  {!p.is_active && <span className="pill pill-warn">Not offered</span>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
                <span className="t-data text-[11px] text-ink-3 mr-auto">
                  {p.picks.length} line{p.picks.length === 1 ? "" : "s"}
                </span>

                <form action={reorderPreset}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <input type="hidden" name="direction" value="up" />
                  <button className="btn btn-sm" disabled={i === 0} aria-label={`Move ${p.name} earlier`}>
                    Up
                  </button>
                </form>
                <form action={reorderPreset}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    className="btn btn-sm"
                    disabled={i === presets.length - 1}
                    aria-label={`Move ${p.name} later`}
                  >
                    Down
                  </button>
                </form>
                <form action={togglePreset}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <input type="hidden" name="active" value={p.is_active ? "off" : "on"} />
                  <button className="btn btn-sm">{p.is_active ? "Stop offering" : "Offer again"}</button>
                </form>
                <Link href={`/admin/presets/${p.slug}`} className="btn btn-sm btn-primary">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
