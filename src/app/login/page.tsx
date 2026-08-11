import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SignInForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to see your saved builds and quote requests.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/account");

  return (
    <div className="shell py-16 sm:py-24">
      <div className="max-w-md mx-auto">
        <p className="t-eyebrow mb-2">Account</p>
        <h1 className="t-display text-3xl mb-2">Sign in</h1>
        <p className="text-ink-2 text-[14px] mb-7">
          Signing in keeps your builds and quote requests in one place. You do not need an account to
          use the configurator or to ask for a quote.
        </p>
        <div className="panel p-6">
          <SignInForm next={next} />
        </div>
      </div>
    </div>
  );
}
