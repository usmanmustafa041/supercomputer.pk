"use client";
import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "@/lib/auth/actions";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  return <form action={action} className="grid gap-3"><input name="email" type="email" required autoComplete="email" className="field" /><button className="btn btn-primary" type="submit">Send instructions</button>{state?.error ? <p role="status" className="text-[13px] text-ink-2">{state.error}</p> : null}</form>;
}
