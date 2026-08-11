import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SignUpForm } from "../login/LoginForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create an account to keep your builds and quote requests together.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getSession()) redirect("/account");

  return (
    <div className="shell py-16 sm:py-24">
      <div className="max-w-md mx-auto">
        <p className="t-eyebrow mb-2">Account</p>
        <h1 className="t-display text-3xl mb-2">Create an account</h1>
        <p className="text-ink-2 text-[14px] mb-7">
          It takes a minute and lets you come back to a build instead of starting again.
        </p>
        <div className="panel p-6">
          <SignUpForm next={next} />
        </div>
      </div>
    </div>
  );
}
