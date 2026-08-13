import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import AdminNav from "./AdminNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/**
 * The gate.
 *
 * proxy.ts turns away anyone with no cookie at all, cheaply, before a render
 * starts. This looks the session up properly, so a disabled or demoted account
 * loses access on the next page view rather than whenever a token expires.
 * Every action that changes data checks again on its own.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/account");

  return (
    <div className="min-h-screen bg-base">
      <AdminNav email={session.email} signOut={signOut} />
      {/* The landmark starts after the navigation. Bottom padding clears the
          phone tab bar. */}
      <main className="pb-20 md:pb-0">{children}</main>
    </div>
  );
}
