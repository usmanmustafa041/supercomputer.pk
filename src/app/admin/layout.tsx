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
 * The real gate.
 *
 * proxy.ts turns away anyone with no cookie at all, which keeps obvious traffic
 * off these routes cheaply, but a cookie is only a claim. This is where the
 * claim gets checked against the API, and every page below inherits the check.
 * The API enforces it a third time on each call, which is the one that actually
 * protects the data.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/account");

  return (
    <div className="min-h-screen bg-base">
      <header className="border-b border-[var(--line)] bg-void/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="shell flex items-center gap-4 h-14">
          <span className="t-display text-[15px] tracking-[-0.02em] shrink-0">Admin</span>
          <AdminNav />
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-[12px] text-ink-2 truncate max-w-[16rem]">
              {session.email}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
