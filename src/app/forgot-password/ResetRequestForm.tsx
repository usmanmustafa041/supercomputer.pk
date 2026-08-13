"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "@/lib/auth/actions";

export default function ResetRequestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  return (
    <form action={action} className="panel p-6 grid gap-3">
      {state?.error && <p role="alert" className="text-warn text-[13px]">{state.error}</p>}
      {state?.ok && <p role="status" className="text-[13px] text-ink-1">{state.ok}</p>}
      {state?.devResetUrl && <Link href={state.devResetUrl} className="text-acc text-[13px] underline">Development reset link</Link>}
      <label className="grid gap-1.5"><span className="t-label">Email</span><input name="email" type="email" required autoComplete="email" className="field" /></label>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Sending" : "Send reset link"}</button>
    </form>
  );
}
