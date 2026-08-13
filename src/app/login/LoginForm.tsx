"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type FormState } from "@/lib/auth/actions";

function Submit({ label }: { label: string }) {
  // useFormStatus reads the state of the form above it, so the button knows it
  // is busy without the page holding any state of its own.
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Working" : label}
    </button>
  );
}

function Problem({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p role="status" className="text-[13px] text-ink-1 border border-[var(--line-mid)] px-3 py-2">
      {state.error ?? state.ok}
    </p>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="grid gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Problem state={state} />
      <label className="grid gap-1.5">
        <span className="t-label">Email</span>
        <input name="email" type="email" autoComplete="email" required className="field" />
      </label>
      <label className="grid gap-1.5">
        <span className="t-label">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      {state?.requiresTwoFactor && (
        <label className="grid gap-1.5">
          <span className="t-label">Authenticator code</span>
          <input name="totp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="field" />
        </label>
      )}
      <Submit label="Sign in" />
      <Link href="/forgot-password" className="text-[13px] text-acc hover:underline text-center">Forgot your password?</Link>
      <p className="text-[13px] text-ink-2 text-center mt-1">
        No account yet?{" "}
        <Link href="/register" className="text-acc hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signUp, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Problem state={state} />
      <label className="grid gap-1.5">
        <span className="t-label">Your name</span>
        <input name="full_name" autoComplete="name" className="field" />
      </label>
      <label className="grid gap-1.5">
        <span className="t-label">Email</span>
        <input name="email" type="email" autoComplete="email" required className="field" />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className="t-label">Company (optional)</span>
          <input name="organisation" autoComplete="organization" className="field" />
        </label>
        <label className="grid gap-1.5">
          <span className="t-label">Phone (optional)</span>
          <input name="phone" type="tel" autoComplete="tel" className="field" />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="t-label">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
        />
        <span className="text-[12px] text-ink-3">At least 10 characters.</span>
      </label>
      <Submit label="Create account" />
      <p className="text-[13px] text-ink-2 text-center mt-1">
        Already registered?{" "}
        <Link href="/login" className="text-acc hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
