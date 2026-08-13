import type { Metadata } from "next";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <div className="shell py-16"><div className="max-w-md mx-auto panel p-6"><h1 className="t-display text-3xl mb-2">Choose a new password</h1><p className="text-ink-2 text-[14px] mb-6">Use at least 12 characters.</p><ResetForm token={token} /></div></div>;
}
