"use client";

import { usePathname } from "next/navigation";

/**
 * The storefront's main-content landmark.
 *
 * The root layout used to declare one <main> around everything, which put the
 * admin panel's own header and navigation inside the site's main-content
 * landmark. Now each section declares its own, and this is the storefront's: it
 * steps aside on /admin, which supplies its own.
 *
 * A client component only because it needs the current path. It renders its
 * children either way, so nothing depends on the browser to appear.
 */
export default function SiteMain({ children }: { children: React.ReactNode }) {
  const inAdmin = usePathname().startsWith("/admin");
  if (inAdmin) return <>{children}</>;
  return <main className="flex-1">{children}</main>;
}
