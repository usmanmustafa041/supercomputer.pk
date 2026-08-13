"use server";

/**
 * Sign in, sign up, sign out.
 *
 * The form posts to these functions, which run on the server, call the API, and
 * put the returned token in an httpOnly cookie. The browser never sees the
 * token in script and the web tier never checks a password itself: the
 * comparison, the timing defences and the rate limiting all live in one place
 * on the API, where they cannot drift out of step with a second copy.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { auth as authApi } from "@/lib/api/resources";
import { COOKIE_OPTIONS, SESSION_COOKIE } from "./session";

export type FormState = { error?: string } | undefined;

/** Only relative paths, so `?next=` cannot bounce someone to another site. */
function safeNext(raw: FormDataEntryValue | null): string | null {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const mfaCode = String(form.get("mfa_code") ?? "").trim();
  if (!email || !password) return { error: "Enter your email and password." };

  let result: Awaited<ReturnType<typeof authApi.signIn>>;
  try {
    result = await authApi.signIn(email, password, mfaCode || undefined);
  } catch (e) {
    if (e instanceof ApiError) {
      // 429 is the rate limiter. Worth saying plainly, because "email or
      // password is incorrect" would send someone off checking a password that
      // was right all along.
      if (e.status === 429) return { error: "Too many attempts. Wait a minute and try again." };
      return { error: e.message };
    }
    return { error: "We could not reach the server. Try again in a moment." };
  }

  (await cookies()).set(SESSION_COOKIE, result.token, COOKIE_OPTIONS);

  // redirect works by throwing, so it has to sit outside anything catching.
  redirect(safeNext(form.get("next")) ?? (result.user.role === "admin" ? "/admin" : "/account"));
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  // Checked here as well so the message arrives without a round trip. The API
  // enforces the same rule, and its answer is the one that counts.
  if (!email.includes("@")) return { error: "That does not look like an email address." };
  if (password.length < 12) return { error: "Pick a password of at least 12 characters." };

  let result: Awaited<ReturnType<typeof authApi.register>>;
  try {
    // Note what is not sent: no role. Signing up always creates a customer,
    // and the API would refuse an unexpected field anyway.
    result = await authApi.register({
      email,
      password,
      fullName: String(form.get("full_name") ?? "").trim() || undefined,
      organisation: String(form.get("organisation") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 429) return { error: "Too many attempts. Wait a minute and try again." };
      return { error: e.message };
    }
    return { error: "We could not reach the server. Try again in a moment." };
  }

  (await cookies()).set(SESSION_COOKIE, result.token, COOKIE_OPTIONS);
  redirect(safeNext(form.get("next")) ?? "/account");
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    // Delete the row, not just the cookie, so the token is dead even if a copy
    // of it was taken. A failure here must not leave someone stuck signed in on
    // this browser, so the cookie goes either way.
    try {
      await authApi.signOut();
    } catch {
      // The session will expire on its own.
    }
  }

  jar.delete(SESSION_COOKIE);
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  try {
    await authApi.requestPasswordReset(email);
    return { error: "If an account exists, reset instructions have been sent." };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "We could not reach the server." };
  }
}

export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!token || password.length < 12) return { error: "Use a valid link and a password of at least 12 characters." };
  try {
    await authApi.confirmPasswordReset(token, password);
    redirect("/login?reset=1");
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "We could not reach the server." };
  }
}
