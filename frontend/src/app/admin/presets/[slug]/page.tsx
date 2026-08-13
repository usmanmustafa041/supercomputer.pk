import Link from "next/link";
import { notFound } from "next/navigation";
import { presets } from "@/lib/api/resources";
import { resolveFamilies } from "@supercomputers/shared";
import { KIND_LABEL } from "@supercomputers/shared";
import PresetForm from "../PresetForm";
import { editPick, removePreset } from "../actions";

export const metadata = { title: "Edit configuration" };

export default async function EditPresetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preset = await presets.bySlug(decodeURIComponent(slug));
  if (!preset) notFound();

  /**
   * Family keys are internal. Resolved here so the list reads as the parts a
   * customer will actually receive, and so a line that no longer matches
   * anything is visible as a problem rather than sitting there as a code.
   */
  const wanted = new Map(preset.picks.map((p) => [p.family, p.variant ?? null]));
  const resolved = resolveFamilies(wanted);

  return (
    <div className="shell py-6 sm:py-8 max-w-4xl">
      <Link href="/admin/presets" className="text-[13px] text-ink-2 hover:text-ink">
        Back to pre-built configurations
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-5">
        <div className="min-w-0">
          <h1 className="t-display text-xl sm:text-2xl leading-tight">{preset.name}</h1>
          <p className="t-data text-[12px] text-ink-3 mt-1">{preset.slug}</p>
        </div>
        <Link href="/configure" className="btn btn-sm">
          Open the configurator
        </Link>
      </div>

      <PresetForm preset={preset} />

      {/* Outside the form above: a form cannot contain another one. */}
      <section className="panel p-4 sm:p-5 mt-6 grid gap-4">
        <div>
          <h2 className="t-label">Parts in this configuration</h2>
          <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
            Quantities can be changed and lines removed here. To add parts, load this in the configurator, change
            it there where the compatibility checks run, and save it again as a new configuration.
          </p>
        </div>

        {preset.picks.length === 0 ? (
          <p className="text-[13px] text-ink-3 border-t border-[var(--line)] pt-4">
            No parts. This will load an empty configurator, so it is worth removing.
          </p>
        ) : (
          <ul className="grid gap-2 border-t border-[var(--line)] pt-4">
            {preset.picks.map((pick, i) => {
              const product = resolved.get(pick.family);
              return (
                <li key={`${pick.family}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    {product ? (
                      <>
                        <span className="t-label text-[9.5px]">{KIND_LABEL[product.kind]}</span>
                        <p className="text-[13px] mt-0.5">
                          <span className="text-ink-2">{product.brand}</span> {product.model}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="t-label text-[9.5px] text-warn">Not found</span>
                        <p className="text-[13px] mt-0.5 t-data">{pick.family}</p>
                        <p className="text-[11.5px] text-warn mt-0.5">
                          Nothing in the catalogue matches this any more. It will be missing when the
                          configuration is loaded.
                        </p>
                      </>
                    )}
                  </div>

                  <form action={editPick} className="flex items-center gap-2 shrink-0">
                    <input type="hidden" name="slug" value={preset.slug} />
                    <input type="hidden" name="index" value={i} />
                    <label className="flex items-center gap-1.5">
                      <span className="t-data text-[10px] text-ink-3 uppercase">Qty</span>
                      <input
                        name="qty"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        defaultValue={pick.qty}
                        className="field h-9 w-16 text-[13px] t-data"
                      />
                    </label>
                    <button className="btn btn-sm">Set</button>
                  </form>

                  <form action={editPick} className="shrink-0">
                    <input type="hidden" name="slug" value={preset.slug} />
                    <input type="hidden" name="index" value={i} />
                    <input type="hidden" name="remove" value="on" />
                    <button className="btn btn-sm text-warn border-[color-mix(in_srgb,var(--color-warn)_40%,transparent)]">
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="panel p-4 sm:p-5 mt-6 border-[color-mix(in_srgb,var(--color-warn)_28%,var(--line))]">
        <h2 className="t-label mb-2">Delete</h2>
        <p className="text-[13px] text-ink-2 mb-4 leading-relaxed">
          If you only want it off the list, use &ldquo;Stop offering&rdquo; instead, which keeps it here and can
          be undone. Deleting cannot.
        </p>
        <form action={removePreset}>
          <input type="hidden" name="slug" value={preset.slug} />
          <button className="btn btn-sm text-warn border-[color-mix(in_srgb,var(--color-warn)_40%,transparent)]">
            Delete {preset.name} permanently
          </button>
        </form>
      </div>
    </div>
  );
}
