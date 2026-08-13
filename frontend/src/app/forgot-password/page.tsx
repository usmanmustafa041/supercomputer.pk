import type { Metadata } from "next";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <div className="shell py-16"><div className="max-w-md mx-auto panel p-6"><h1 className="t-display text-3xl mb-2">Reset password</h1><p className="text-ink-2 text-[14px] mb-6">Enter your email and we will send reset instructions if the account exists.</p><ForgotForm /></div></div>;
}
