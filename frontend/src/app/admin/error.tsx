"use client";

/**
 * What an administrator sees when a panel page fails.
 *
 * This exists because of how badly the alternative went. A single page threw on
 * a figure that came back undefined, and with no boundary here the failure took
 * the layout with it: no navigation, no sign-out button, a blank white screen on
 * every admin route. One small bug read as the whole panel being dead.
 *
 * Being inside the admin folder is what makes it useful. Next renders it in
 * place of the page but keeps the layout around it, so the header and the
 * navigation survive and there is still a way out.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server logs the real thing; this is what reaches the browser console
    // if somebody is looking.
    console.error("admin page failed:", error);
  }, [error]);

  return (
    <div className="shell py-10 max-w-2xl">
      <div className="panel p-6 border-[color-mix(in_srgb,var(--color-warn)_30%,var(--line))]">
        <h1 className="t-display text-xl mb-2">This page did not load</h1>
        <p className="text-[13.5px] text-ink-1 leading-relaxed">
          Something went wrong on our side, not yours. Nothing you were working on has been changed.
        </p>
        {error.digest && (
          <p className="t-data text-[11.5px] text-ink-3 mt-3">
            Reference {error.digest}. Quote it if you report this.
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-5">
          <button onClick={reset} className="btn btn-primary btn-sm">
            Try again
          </button>
          <Link href="/admin" className="btn btn-sm">
            Back to the overview
          </Link>
        </div>
      </div>
    </div>
  );
}
