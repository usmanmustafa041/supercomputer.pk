"use client";
import { useActionState } from "react";
import { resetPassword, type FormState } from "@/lib/auth/actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);
  return <form action={action} className="grid gap-3"><input type="hidden" name="token" value={token} /><input name="password" type="password" required minLength={12} autoComplete="new-password" className="field" placeholder="New password" /><button className="btn btn-primary" type="submit">Update password</button>{state?.error ? <p role="alert" className="text-[13px] text-warn">{state.error}</p> : null}</form>;
}
