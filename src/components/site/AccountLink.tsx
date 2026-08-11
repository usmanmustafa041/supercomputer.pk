"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/api/types";

/** null means signed out; undefined means we have not looked yet. */
export default function AccountLink({ className = "" }: { className?: string }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const path = usePathname();

  useEffect(() => {
    let live = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => live && setSession(s))
      .catch(() => live && setSession(null));
    return () => {
      live = false;
    };
    // Re-checks after sign-in or sign-out, both of which change the route.
  }, [path]);

  // Render nothing until we know, rather than flashing "Sign in" at someone
  // who is already signed in.
  if (session === undefined) return <span className={className} aria-hidden />;

  if (!session) {
    return (
      <Link href="/login" className={className}>
        Sign in
      </Link>
    );
  }

  return (
    <Link href={session.role === "admin" ? "/admin" : "/account"} className={className}>
      {session.role === "admin" ? "Admin" : "Account"}
    </Link>
  );
}
