"use server";

/**
 * Sign in, sign up, sign out.
 *
 * The form posts straight to these functions, which run on the server. The
 * password is checked here and a session cookie is written here; the browser
 * never sees anything but the cookie, and the cookie is marked httpOnly so page
 * scripts cannot read it either.
 */

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "@/lib/db/client";
import { ensureReady } from "@/lib/db/init";
import { hashPassword, verifyPassword } from "./password";
import { COOKIE_OPTIONS, createSession, destroySession, SESSION_COOKIE } from "./session";
import type { UserRow } from "@/lib/db/types";
import { audit } from "./audit";
import { decryptTotpSecret, encryptTotpSecret, newTotpSecret, totpUri, verifyTotp } from "./totp";
import { consumeRateLimit, opaqueKey } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email";
import { getSession } from "./session";

export type FormState = { error?: string; ok?: string; requiresTwoFactor?: boolean; devResetUrl?: string } | undefined;

async function requestAddress(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Only relative paths, so `?next=` cannot bounce someone to another site. */
function safeNext(raw: FormDataEntryValue | null): string | null {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 200) return { error: "Enter your email and password." };

  await ensureReady();

  const address = await requestAddress();
  const allowed = await consumeRateLimit(opaqueKey("login", `${address}:${email}`), 10, 15 * 60);
  if (!allowed) return { error: "Too many sign-in attempts. Try again in 15 minutes." };

  const user = await one<UserRow & { password_hash: string; totp_secret: string | null }>(
    `SELECT id, email, password_hash, role, is_active, failed_login_count,
            locked_until, totp_enabled, totp_secret
       FROM users WHERE email = $1`,
    [email],
  );

  // The same answer whether the email is unknown or the password is wrong, so
  // this form cannot be used to find out which addresses are registered.
  if (user?.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { error: "This account is temporarily locked. Try again later." };
  }
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    if (user) {
      await query(
        `UPDATE users SET
           failed_login_count = failed_login_count + 1,
           locked_until = CASE WHEN failed_login_count + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END
         WHERE id = $1`,
        [user.id],
      );
      await audit(user.id, "auth.login_failed", user.email);
    }
    return { error: "Email or password is incorrect." };
  }
  if (!user.is_active) return { error: "This account has been disabled." };

  if (user.totp_enabled) {
    const code = String(form.get("totp") ?? "").trim();
    if (!code) return { requiresTwoFactor: true, error: "Enter the six-digit code from your authenticator." };
    if (!user.totp_secret || !verifyTotp(decryptTotpSecret(user.totp_secret), code)) {
      await audit(user.id, "auth.two_factor_failed", user.email);
      return { requiresTwoFactor: true, error: "The authentication code is not valid." };
    }
  }

  await query("UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1", [user.id]);

  const token = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, COOKIE_OPTIONS);
  await audit(user.id, "auth.login", user.email);

  // redirect works by throwing, so it has to sit outside anything catching.
  redirect(safeNext(form.get("next")) ?? (user.role === "admin" ? "/admin" : "/account"));
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fullName = String(form.get("full_name") ?? "").trim();
  const organisation = String(form.get("organisation") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: "That does not look like an email address." };
  if (password.length < 10 || password.length > 200) return { error: "Pick a password of at least 10 characters." };
  if (fullName.length > 120 || organisation.length > 160 || phone.length > 40) return { error: "One or more fields are too long." };
  if (String(form.get("website") ?? "")) return { error: "Could not create the account." };

  await ensureReady();
  const address = await requestAddress();
  if (!await consumeRateLimit(opaqueKey("signup", address), 5, 60 * 60)) {
    return { error: "Too many accounts were requested. Try again later." };
  }

  const taken = await one<{ id: number }>("SELECT id FROM users WHERE email = $1", [email]);
  if (taken) return { error: "An account with that email already exists." };

  // Signing up always creates a customer. Administrators are made by an
  // administrator, so this form cannot be used to give yourself the portal.
  const rows = await query<{ id: number }>(
    `INSERT INTO users (email, password_hash, full_name, organisation, phone, role)
     VALUES ($1, $2, $3, $4, $5, 'customer') RETURNING id`,
    [
      email,
      await hashPassword(password),
      fullName || null,
      organisation || null,
      phone || null,
    ],
  );

  const token = await createSession(rows[0].id);
  (await cookies()).set(SESSION_COOKIE, token, COOKIE_OPTIONS);
  await audit(rows[0].id, "auth.signup", email);
  redirect(safeNext(form.get("next")) ?? "/account");
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  await ensureReady();
  const address = await requestAddress();
  if (!await consumeRateLimit(opaqueKey("reset", `${address}:${email}`), 3, 60 * 60)) {
    return { ok: "If that account exists, a reset link has been sent." };
  }
  const user = await one<{ id: number; email: string }>("SELECT id, email FROM users WHERE email = $1 AND is_active", [email]);
  if (!user) return { ok: "If that account exists, a reset link has been sent." };

  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);
  await query(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
     VALUES ($1,$2,now() + interval '30 minutes')`,
    [hash, user.id],
  );
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  const delivered = await sendEmail(user.email, "Reset your Supercomputers password", `Use this link within 30 minutes:\n\n${resetUrl}`);
  await audit(user.id, "auth.password_reset_requested", user.email, { delivered });
  return {
    ok: "If that account exists, a reset link has been sent.",
    ...(process.env.NODE_ENV !== "production" && !delivered ? { devResetUrl: resetUrl } : {}),
  };
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 10 || password.length > 200) return { error: "Use at least 10 characters." };
  const hash = createHash("sha256").update(token).digest("hex");
  await ensureReady();
  const row = await one<{ user_id: number }>(
    `SELECT user_id FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hash],
  );
  if (!row) return { error: "This reset link is invalid or has expired." };
  await query("UPDATE users SET password_hash = $1, failed_login_count = 0, locked_until = NULL WHERE id = $2", [await hashPassword(password), row.user_id]);
  await query("UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1", [hash]);
  await query("DELETE FROM sessions WHERE user_id = $1", [row.user_id]);
  await audit(row.user_id, "auth.password_reset_completed");
  return { ok: "Password updated. You can now sign in." };
}

export type TwoFactorState = { error?: string; ok?: string; secret?: string; uri?: string } | undefined;

export async function beginTwoFactor(): Promise<TwoFactorState> {
  const session = await getSession();
  if (!session) return { error: "Sign in again." };
  const secret = newTotpSecret();
  await query("UPDATE users SET totp_secret = $1, totp_enabled = FALSE WHERE id = $2", [encryptTotpSecret(secret), session.id]);
  await audit(session.id, "auth.two_factor_setup_started", session.email);
  return { secret, uri: totpUri(secret, session.email) };
}

export async function enableTwoFactor(_prev: TwoFactorState, form: FormData): Promise<TwoFactorState> {
  const session = await getSession();
  if (!session) return { error: "Sign in again." };
  const row = await one<{ totp_secret: string | null }>("SELECT totp_secret FROM users WHERE id = $1", [session.id]);
  const code = String(form.get("totp") ?? "").trim();
  if (!row?.totp_secret || !verifyTotp(decryptTotpSecret(row.totp_secret), code)) return { error: "That code is not valid." };
  await query("UPDATE users SET totp_enabled = TRUE WHERE id = $1", [session.id]);
  await audit(session.id, "auth.two_factor_enabled", session.email);
  return { ok: "Two-factor authentication is enabled." };
}

export async function disableTwoFactor(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await query("UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE id = $1", [session.id]);
  await audit(session.id, "auth.two_factor_disabled", session.email);
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  // Delete the row, not just the cookie, so the token is dead even if a copy
  // of it was taken.
  if (token) await destroySession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
