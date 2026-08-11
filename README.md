# Teraforge

A storefront and configurator for refurbished HPC hardware sold in Pakistan: clusters, GPU servers, AI
workstations and every component that goes into them. The interesting part is not the shop, it is the
compatibility engine behind the configurator.

Next.js 16 (App Router), React 19, Tailwind v4, TypeScript. No database — the catalog is generated.

```
npm install
npm run dev          # http://localhost:3000
npm run check        # typecheck + lint + compatibility engine tests
```

## How the catalog works

There is no CMS and no product table. `src/lib/catalog/families.ts` and `families-ext.ts` hold roughly 130
hand-authored **families**, one per real part, carrying real vendor specs. `expand.ts` multiplies those into
2,777 shipping SKUs across three axes that genuinely exist in this market:

- **Board partner and tier.** One die goes to ASUS, MSI, Gigabyte, ZOTAC and the rest, each shipping two or
  three tiers. The tiers are not cosmetic — a ROG Strix is longer, thicker and pulls more power than a
  Ventus, and the expander adjusts length, slot width, TDP, recommended PSU and price accordingly.
- **Condition grade.** Six of them, each with its own price factor and warranty term.
- **Capacity and configuration.** Memory kits by module size and count, drives by capacity, supplies by
  wattage, cables by length and vendor coding.

Expansion is deterministic — a seeded hash, not `Math.random()` — so a SKU id generated during the build
matches the one generated in the browser. `npm run catalog:stats` prints the composition and asserts zero
id or slug collisions.

The first pass came out badly lopsided (800 GPUs against 25 motherboards), which made the configurator
useless. `families-ext.ts` exists to fix that. It is still GPU-heavy, because the market is.

## The compatibility engine

`src/lib/compat/engine.ts`. Forty-eight rules across processor/board, cooling, memory, accelerators,
storage, power, fabric and facility. Four severities: `error` blocks a quote, `warn` does not, `info`
explains a consequence, `gain` points at a free improvement.

The rules that earn their keep are not the socket check. They are:

- **Memory channel population.** Eight modules on a twelve-channel EPYC costs about a third of your memory
  bandwidth and nothing in the machine will ever tell you.
- **Slot width versus lane wiring.** An x16 connector wired x4 fits the card and halves its bandwidth.
- **Passive cards in a tower.** Datacenter accelerators have no fans at all and depend entirely on chassis
  static pressure.
- **U.2 versus U.3 backplanes.** The compatibility runs one direction only. The connector mates either way,
  and then the drive never enumerates.
- **Power connector arithmetic.** Counting native 12V-2x6 leads against cards that need them, because the
  four-way 8-pin adapter is where melted connectors come from.
- **Optic vendor coding.** Electrically fine, firmware refuses, port stays dark, nobody can see why.
- **Pakistani mains.** 230V, the 2.9kW continuous ceiling on a domestic 16A circuit, three-phase past
  ~7.4kW, and double-conversion UPS because of how the grid actually behaves here.

`npm run compat:test` runs nine builds with known defects and asserts the expected rules fire. It caught
four real bugs on first run, including a rule that could never fire because every ConnectX card in the
catalog is correctly typed VPI rather than InfiniBand-only.

`/rules` documents every rule for customers, with its id.

## Sourcing

Resolution order is our own stock, then our import channel, then Pakistani retailers.

`src/lib/sourcing/retailers.ts` is the registry, and every claim in it was probed over HTTPS rather than
assumed. That check deleted five domains I had guessed at — `servermall.pk`, `netmall.pk`,
`digitalworldpk.com`, `vatancomputers.com` and `hashmiitstore.com` are all NXDOMAIN. Search endpoints were
probed separately, which also mattered: IndusTech's OpenCart route returns 401 while a plainer path works,
and Mega.pk's search 500s entirely. Both are recorded as what they are.

Four stores (Computer Zone, PakLap, iShopping, MyShop) are real but sit behind a WAF that rejects
datacenter traffic. They are linked to and never read from.

`npm run sourcing:verify` re-checks the whole registry against the live web and exits non-zero if a claim
no longer holds.

**Live pricing is off by default.** Set `FIRECRAWL_API_KEY` and external offers get real prices read from
reachable retailers, cached an hour. Without it, every external offer is a deep link to that retailer's own
search, labelled as such. A stale scraped price shown as current is worse than no price.

## Themes

Dark is the brand default; light is a deliberate alternative rather than a reaction to system preference.
Both palettes come from one token set: `@theme inline` makes Tailwind emit `var(--c-*)` into utilities
instead of baking literals, so the whole thing swaps from one attribute on `<html>`. An inline script in
`<head>` applies the stored choice before first paint. Append `?theme=light` or `?theme=dark` to any URL to
force one — useful for screenshots and for sharing a link that opens the way you meant it to.

The part drawings carry their own `--art-*` palette so they read as machined metal on white rather than as
photo negatives of the dark versions.

## Imagery

There are no photographs. `src/components/art/PartArt.tsx` draws each part as a technical elevation from
its own spec fields — a 267mm dual-slot passive card is drawn 267mm long, dual-slot and finned, with its
actual power connectors. Hotlinking retailer photography would be legally questionable and visually
incoherent; you get four lighting setups in one grid. This way 2,777 SKUs share one camera, one line
weight and one palette, and nothing 404s.

## What is not done

- **No backend.** The quote form composes a `mailto:` draft. There is no CRM, no order pipeline, no
  payments. That is deliberate for this domain — nobody Stripe-checkouts a PKR 1.5 crore cluster — but a
  real quote pipeline is the obvious next piece.
- **`FX_USD_PKR` is a hardcoded constant** in `expand.ts`. Every price derives from it, so the whole
  catalog reprices from one line, but nothing updates it automatically.
- **Landed-cost multipliers are estimates.** 1.34 for components, 1.28 for systems. Somebody who actually
  clears shipments should replace these with real numbers.
- **Stock levels are generated,** seeded off the SKU id. There is no inventory system behind them.
- **The rules only check that a machine will assemble, boot and stay inside its electrical and thermal
  envelope.** They cannot tell you it is the right machine. Four 16GB cards and one 64GB card both pass
  every check; only one holds the model you are training.
- Accessibility has had a pass (skip link, focus rings, labelled controls, `prefers-reduced-motion`) but
  not an audit with a screen reader.

## Layout

```
src/lib/catalog/     families, expansion, query and formatting
src/lib/compat/      the rule engine and build summary
src/lib/sourcing/    retailer registry, resolution, optional live lookup
src/components/art/  procedural part drawings
src/app/configure/   configurator, part picker, presets
scripts/             catalog stats, engine tests, registry verification
```

One thing worth knowing before editing `globals.css`: the component classes live inside
`@layer components` deliberately. Unlayered CSS beats every Tailwind utility, and while they were unlayered
`.btn` silently won against `lg:hidden`, leaving the mobile menu button on screen at desktop widths.
