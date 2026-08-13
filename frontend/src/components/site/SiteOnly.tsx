"use client";

import { usePathname } from "next/navigation";

/** Hides the public site chrome on the admin portal, which has its own. */
export default function SiteOnly({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/admin") ? null : <>{children}</>;
}
