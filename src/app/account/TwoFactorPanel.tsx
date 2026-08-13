"use client";

import { useActionState } from "react";
import { beginTwoFactor, enableTwoFactor, type TwoFactorState } from "@/lib/auth/actions";

export default function TwoFactorPanel({ enabled, disableAction }: { enabled: boolean; disableAction: () => Promise<void> }) {
  const [setup, setupAction, setupPending] = useActionState<TwoFactorState, FormData>(async () => beginTwoFactor(), undefined);
  const [verify, verifyAction, verifyPending] = useActionState<TwoFactorState, FormData>(enableTwoFactor, undefined);
  if (enabled || verify?.ok) return <form action={disableAction} className="panel p-5"><p className="text-[13px] text-ink-1 mb-3">Two-factor authentication is enabled.</p><button className="btn btn-ghost btn-sm">Disable two-factor authentication</button></form>;
  return (
    <div className="panel p-5 grid gap-3">
      <p className="text-[13px] text-ink-2">Protect this account with any TOTP authenticator application.</p>
      {!setup?.secret ? <form action={setupAction}><button className="btn btn-ghost btn-sm" disabled={setupPending}>Set up authenticator</button></form> : <>
        <p className="text-[12px] text-ink-2">Add this setup key to your authenticator:</p>
        <code className="text-[12px] text-acc break-all">{setup.secret}</code>
        <details><summary className="text-[12px] cursor-pointer">Authenticator URI</summary><code className="text-[10px] break-all">{setup.uri}</code></details>
        <form action={verifyAction} className="flex gap-2"><input name="totp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="field" placeholder="Six-digit code" /><button className="btn btn-primary btn-sm" disabled={verifyPending}>Verify</button></form>
      </>}
      {(setup?.error || verify?.error) && <p role="alert" className="text-warn text-[12px]">{setup?.error || verify?.error}</p>}
    </div>
  );
}
