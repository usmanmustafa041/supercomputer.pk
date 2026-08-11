"use server";

/**
 * Sign in, sign up, sign out.
 *
 * These run on the server. The form posts here, the server talks to the API,
 * and the token is written straight into an httpOnly cookie. It never passes
 * through browser JavaScript, so there is nothing on the page for a script to
 * steal.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError, SESSION_COOKIE } from "@/lib/api/server";
import { COOKIE_OPTIONS } from "./session";
import type { Role } from "@/lib/api/types";

type TokenOut = { access_token: string; user: { role: Role } };

export type FormState = { error?: string } | undefined;

/** Only allow relative paths, so `?next=` cannot be used to bounce off-site. */
function safeNext(raw: FormDataEntryValue | null): string | null {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  let out: TokenOut;
  try {
    out = await api<TokenOut>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not reach the server. Try again in a moment." };
  }

  (await cookies()).set(SESSION_COOKIE, out.access_token, COOKIE_OPTIONS);

  // redirect throws, so it has to be outside the try above.
  redirect(safeNext(form.get("next")) ?? (out.user.role === "admin" ? "/admin" : "/account"));
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Pick a password of at least 8 characters." };

  let out: TokenOut;
  try {
    out = await api<TokenOut>("/api/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        full_name: String(form.get("full_name") ?? "") || null,
        organisation: String(form.get("organisation") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: "Could not reach the server. Try again in a moment." };
  }

  (await cookies()).set(SESSION_COOKIE, out.access_token, COOKIE_OPTIONS);
  redirect(safeNext(form.get("next")) ?? "/account");
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
