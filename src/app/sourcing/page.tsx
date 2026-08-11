import Link from "next/link";
import type { Metadata } from "next";
import { KIND_LABEL } from "@/lib/catalog";
import { RETAILERS, VERIFIED_AT } from "@/lib/sourcing/retailers";

export const metadata: Metadata = {
  title: "Sourcing network",
  description:
    "How we decide where a part comes from, and how the Pakistani retailer list was verified rather than guessed.",
};

const REACH_COPY = {
  direct: {
    label: "Verified reachable",
    tone: "pill-ok",
    note: "Resolved over HTTPS and served a real page. Where a search endpoint was probed and returned results matching the query, we deep-link straight into it.",
  },
  "waf-blocked": {
    label: "Link only",
    tone: "pill-warn",
    note: "A real, established store whose firewall rejects automated requests. We link to the site and make no attempt to read stock or prices from it.",
  },
  "browse-only": {
    label: "Homepage only",
    tone: "",
    note: "Reachable, but we could not verify a working search endpoint, so we link to the homepage rather than send you to a broken URL.",
  },
} as const;

export default function SourcingPage() {
  const direct = RETAILERS.filter((r) => r.reach === "direct");
  const blocked = RETAILERS.filter((r) => r.reach === "waf-blocked");
  const browse = RETAILERS.filter((r) => r.reach === "browse-only");
  const marketplaces = RETAILERS.filter((r) => r.marketplace);

  return (
    <div className="shell py-9 md:py-12">
      <header className="max-w-3xl mb-10">
        <p className="t-eyebrow mb-2.5">Sourcing</p>
        <h1 className="t-display text-[clamp(1.9rem,4.4vw,3.1rem)]">
          Where the parts actually come from
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-1">
          We check our own stock first, then our import channel, then everyone else. That last step is the
          unusual one, so it is worth explaining how the list of &ldquo;everyone else&rdquo; was built — and what
          it deliberately does not claim.
        </p>
      </header>

      {/* ------------------------------------------------------------- order */}
      <section className="mb-14">
        <h2 className="t-display text-[24px] mb-5">Resolution order</h2>
        <ol className="grid gap-px bg-[var(--line)] border border-[var(--line)] md:grid-cols-3">
          {[
            ["01", "Our own shelf", "If the unit is physically in Lahore or Karachi, that is the offer. Tested, graded, dispatched the same day."],
            ["02", "Our import channel", "Not held locally, but we can bring it in against a confirmed order. The quoted price is landed: duty, GST and clearing included, no surprises at the port."],
            ["03", "Verified retailers", "If the lead time does not suit you, we link to Pakistani shops that carry the category. We would rather lose the line than sit on your order for six weeks."],
          ].map(([n, title, body]) => (
            <li key={n} className="bg-[var(--color-surface)] p-6">
              <span className="t-data text-[11px] text-acc tracking-[0.2em]">{n}</span>
              <h3 className="t-display text-[19px] mt-2.5">{title}</h3>
              <p className="text-[13px] text-ink-1 mt-2.5 leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------- methodology */}
      <section className="mb-14 grid lg:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="t-display text-[24px] mb-4">How the list was verified</h2>
          <div className="space-y-3.5 text-[14px] leading-relaxed text-ink-1">
            <p>
              Every domain was probed over HTTPS on {VERIFIED_AT}: does it resolve, does it answer, does it
              return a real page rather than a parked placeholder. Then, separately, each store&apos;s search
              endpoint was called with a live query and the response checked for results that actually reflected
              it.
            </p>
            <p>
              That second step matters more than it sounds. Guessing a search URL pattern from the platform is
              easy and wrong often enough to be useless — one store&apos;s OpenCart route returned 401 while a
              different path worked fine, and another&apos;s search endpoint returned a server error entirely.
              Both are marked accordingly rather than shipped broken.
            </p>
            <p>
              Several domains that seemed plausible did not resolve at all. They were removed rather than left
              in on the assumption they were probably fine.
            </p>
            <p className="text-ink">
              What this list does not do is claim a price. Unless a live read succeeded, an external offer is a
              deep link to that retailer&apos;s own search, labelled as such. A stale scraped price presented as
              current is worse than no price.
            </p>
          </div>
        </div>

        <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
          {(Object.keys(REACH_COPY) as Array<keyof typeof REACH_COPY>).map((k) => {
            const n = RETAILERS.filter((r) => r.reach === k).length;
            return (
              <div key={k} className="bg-[var(--color-surface)] p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`pill ${REACH_COPY[k].tone}`}>{REACH_COPY[k].label}</span>
                  <span className="t-data text-[12px] text-ink-2">{n} of {RETAILERS.length}</span>
                </div>
                <p className="text-[12.5px] text-ink-1 leading-relaxed">{REACH_COPY[k].note}</p>
              </div>
            );
          })}
          <div className="bg-[var(--color-surface)] p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="pill pill-warn">Marketplace</span>
              <span className="t-data text-[12px] text-ink-2">{marketplaces.length} of {RETAILERS.length}</span>
            </div>
            <p className="text-[12.5px] text-ink-1 leading-relaxed">
              Listings by third-party sellers, not the platform. Useful — often the only local source for
              decommissioned enterprise gear — but the assurance is not the same and we label it every time.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- registry */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <h2 className="t-display text-[24px]">The registry</h2>
          <p className="t-data text-[11.5px] text-ink-3">Last verified {VERIFIED_AT}</p>
        </div>

        {[
          ["Verified reachable", direct],
          ["Link only — bot-protected", blocked],
          ["Homepage only", browse],
        ].map(([heading, list]) => {
          const rows = list as typeof RETAILERS;
          if (!rows.length) return null;
          return (
            <div key={heading as string} className="mb-8">
              <h3 className="t-label mb-3">{heading as string} · {rows.length}</h3>
              <div className="space-y-px bg-[var(--line)] border border-[var(--line)]">
                {rows.map((r) => (
                  <article key={r.id} className="bg-[var(--color-surface)] p-4 md:px-5 grid md:grid-cols-[16rem_1fr] gap-3 md:gap-6">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-[14px] font-medium hover:text-acc transition-colors"
                        >
                          {r.name}
                        </a>
                        {r.marketplace && <span className="pill pill-warn">marketplace</span>}
                      </div>
                      <p className="t-data text-[11px] text-ink-3 mt-1">
                        {r.host} · {r.city}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`pill ${REACH_COPY[r.reach].tone}`}>{REACH_COPY[r.reach].label}</span>
                        {r.searchVerified && <span className="pill pill-cool">search verified</span>}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink-1 leading-relaxed">{r.note}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {r.carries.map((k) => (
                          <Link
                            key={k}
                            href={`/catalog?kind=${k}`}
                            className="t-data text-[10px] px-1.5 py-0.5 border border-[var(--line)] text-ink-2 hover:text-acc hover:border-[var(--line-hi)] transition-colors"
                          >
                            {KIND_LABEL[k]}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-10 panel p-6 md:p-8">
        <h2 className="t-display text-[20px]">A note on live pricing</h2>
        <p className="mt-3 text-[13.5px] text-ink-1 leading-relaxed max-w-3xl">
          The sourcing layer can read live prices from reachable retailers when a fetch key is configured on the
          server. It is off by default. With it off, every external link goes to that retailer&apos;s own search
          page so you see their current price on their own site, which is the only place it is ever guaranteed to
          be correct. Sites that block automated traffic are never read either way.
        </p>
        <p className="mt-3 text-[13.5px] text-ink-1 leading-relaxed max-w-3xl">
          We take no commission on anything you buy through these links, and there is no affiliate tagging on
          them. They exist because sending you somewhere useful is better business than pretending we are the
          only option.
        </p>
      </section>
    </div>
  );
}
