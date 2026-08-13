import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { quotes as quotesApi } from "@/lib/api/resources";
import { getSession } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { QUOTE_STATUS_LABEL, type QuoteRow } from "@/lib/api/types";

export const metadata: Metadata = { title: "Your account" };

// Dates arrive as ISO strings now, because they came through JSON rather than
// out of a driver that hydrates them into Date objects.
function when(at: string) {
  return new Date(at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");

  let quotes: QuoteRow[] = [];
  let offline = false;
  try {
    quotes = await quotesApi.mine();
  } catch {
    offline = true;
  }

  return (
    <div className="shell py-12 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="t-eyebrow mb-2">Account</p>
          <h1 className="t-display text-3xl">{session.fullName || session.email}</h1>
          <p className="text-ink-2 text-[14px] mt-1">
            {session.email}
            {session.organisation ? ` · ${session.organisation}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.role === "admin" && (
            <Link href="/admin" className="btn btn-primary btn-sm">
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="btn btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <h2 className="t-label mb-3">Your quote requests</h2>

      {offline ? (
        <p className="panel p-6 text-[14px] text-ink-2">
          We could not load your requests just now. Refresh in a moment.
        </p>
      ) : quotes.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-[15px] mb-1">No requests yet.</p>
          <p className="text-ink-2 text-[14px] mb-5">
            Configure a system and ask us to price it. Every request you send appears here.
          </p>
          <Link href="/configure" className="btn btn-primary">
            Open the configurator
          </Link>
        </div>
      ) : (
        <ul className="grid gap-2">
          {quotes.map((q) => (
            <li key={q.id} className="panel p-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="t-data text-[13px] text-ink">{q.reference}</span>
              <span className="text-[13px] text-ink-2">{when(q.created_at)}</span>
              <span className="text-[13px] text-ink-2">
                {q.lines.length} {q.lines.length === 1 ? "item" : "items"}
              </span>
              <span className={`pill ml-auto ${q.status === "new" ? "pill-cool" : ""}`}>
                {QUOTE_STATUS_LABEL[q.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
