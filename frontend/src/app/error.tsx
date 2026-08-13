"use client";

/**
 * The storefront's error boundary.
 *
 * A customer who hits a broken page should get something that still looks like
 * the shop, with a way back, rather than a browser error screen. It says
 * nothing about what actually failed: the reference is enough for us to find it
 * in the logs, and the detail is not the customer's problem.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("page failed:", error);
  }, [error]);

  return (
    <div className="shell py-20 max-w-xl text-center">
      <p className="t-eyebrow mb-3">Something went wrong</p>
      <h1 className="t-display text-[clamp(1.6rem,4vw,2.4rem)] mb-4">This page did not load</h1>
      <p className="text-[14px] text-ink-1 leading-relaxed">
        It is a fault on our side. Try again in a moment, and if it keeps happening the configurator and the
        catalogue are still worth a look.
      </p>
      {error.digest && (
        <p className="t-data text-[11.5px] text-ink-3 mt-4">Reference {error.digest}</p>
      )}
      <div className="flex flex-wrap gap-3 justify-center mt-7">
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Back to the home page
        </Link>
      </div>
    </div>
  );
}
