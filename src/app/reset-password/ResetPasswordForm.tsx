"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type FormState } from "@/lib/auth/actions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, undefined);
  return (
    <form action={action} className="panel p-6 grid gap-3">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p role="alert" className="text-warn text-[13px]">{state.error}</p>}
      {state?.ok && <p role="status" className="text-[13px] text-ink-1">{state.ok} <Link href="/login" className="text-acc underline">Sign in</Link></p>}
      <label className="grid gap-1.5"><span className="t-label">New password</span><input name="password" type="password" minLength={10} maxLength={200} required autoComplete="new-password" className="field" /></label>
      <button className="btn btn-primary" disabled={pending || Boolean(state?.ok)}>{pending ? "Updating" : "Update password"}</button>
    </form>
  );
}
