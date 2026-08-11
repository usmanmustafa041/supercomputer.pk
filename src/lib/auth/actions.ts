"use server";

/**
 * Sign in, sign up, sign out.
 *
 * The form posts straight to these functions, which run on the server. The
 * password is checked here and a session cookie is written here; the browser
 * never sees anything but the cookie, and the cookie is marked httpOnly so page
 * scripts cannot read it either.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "@/lib/db/client";
import { ensureReady } from "@/lib/db/init";
import { hashPassword, verifyPassword } from "./password";
import { COOKIE_OPTIONS, createSession, destroySession, SESSION_COOKIE } from "./session";
import type { UserRow } from "@/lib/db/types";

export type FormState = { error?: string } | undefined;

/** Only relative paths, so `?next=` cannot bounce someone to another site. */
function safeNext(raw: FormDataEntryValue | null): string | null {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  await ensureReady();

  const user = await one<UserRow & { password_hash: string }>(
    "SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1",
    [email],
  );

  // The same answer whether the email is unknown or the password is wrong, so
  // this form cannot be used to find out which addresses are registered.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Email or password is incorrect." };
  }
  if (!user.is_active) return { error: "This account has been disabled." };

  const token = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, COOKIE_OPTIONS);

  // redirect works by throwing, so it has to sit outside anything catching.
  redirect(safeNext(form.get("next")) ?? (user.role === "admin" ? "/admin" : "/account"));
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email.includes("@")) return { error: "That does not look like an email address." };
  if (password.length < 8) return { error: "Pick a password of at least 8 characters." };

  await ensureReady();

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
      String(form.get("full_name") ?? "").trim() || null,
      String(form.get("organisation") ?? "").trim() || null,
      String(form.get("phone") ?? "").trim() || null,
    ],
  );

  const token = await createSession(rows[0].id);
  (await cookies()).set(SESSION_COOKIE, token, COOKIE_OPTIONS);
  redirect(safeNext(form.get("next")) ?? "/account");
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
