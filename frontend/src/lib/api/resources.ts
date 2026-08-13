/**
 * Named calls, so pages never build URLs by hand.
 *
 * One place where every endpoint the web tier uses is written down, which makes
 * it obvious what this application actually needs from the API and easy to see
 * when something changes on the other side.
 */

import "server-only";
import { api } from "./client";
import type {
  Page,
  PresetRow,
  ProductImage,
  ProductRow,
  QuoteRow,
  QuoteStatus,
  SessionUser,
} from "./types";

/* ------------------------------------------------------------------- auth */

export const auth = {
  signIn: (email: string, password: string, mfaCode?: string) =>
    api<{ token: string; user: SessionUser }>("/auth/sign-in", {
      method: "POST",
      body: { email, password, ...(mfaCode ? { mfaCode } : {}) },
    }),

  register: (input: {
    email: string;
    password: string;
    fullName?: string;
    organisation?: string;
    phone?: string;
  }) => api<{ token: string; user: SessionUser }>("/auth/register", { method: "POST", body: input }),

  signOut: () => api<void>("/auth/sign-out", { method: "POST", auth: true }),

  me: () => api<SessionUser>("/auth/me", { auth: true }),

  verifyEmail: (token: string) => api<void>("/auth/verify-email", { method: "POST", body: { token } }),
  requestPasswordReset: (email: string) => api<void>("/auth/password-reset/request", { method: "POST", body: { email } }),
  confirmPasswordReset: (token: string, password: string) =>
    api<void>("/auth/password-reset/confirm", { method: "POST", body: { token, password } }),
};

/* --------------------------------------------------------------- products */

export const products = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Page<ProductRow>>(`/products${qs(params)}`, { revalidate: 30 }),

  adminList: (params: Record<string, string | number | undefined> = {}) =>
    api<Page<ProductRow>>(`/products/admin/list${qs(params)}`, { auth: true }),

  bySku: (sku: string) => api<ProductRow>(`/products/${encodeURIComponent(sku)}`, { auth: true }),

  bySlug: (slug: string) => api<ProductRow>(`/products/slug/${encodeURIComponent(slug)}`, { revalidate: 60 }),

  counts: () => api<Record<string, number>>("/products/counts", { revalidate: 300 }),

  images: (sku: string) =>
    api<ProductImage[]>(`/products/${encodeURIComponent(sku)}/images`, { revalidate: 30 }),

  create: (body: Record<string, unknown>) =>
    api<ProductRow>("/products", { method: "POST", body, auth: true }),

  update: (sku: string, body: Record<string, unknown>) =>
    api<ProductRow>(`/products/${encodeURIComponent(sku)}`, { method: "PATCH", body, auth: true }),

  setStock: (sku: string, stock_qty: number) =>
    api<ProductRow>(`/products/${encodeURIComponent(sku)}/stock`, {
      method: "PATCH",
      body: { stock_qty },
      auth: true,
    }),

  restore: (sku: string) =>
    api<void>(`/products/${encodeURIComponent(sku)}/restore`, { method: "POST", auth: true }),

  remove: (sku: string, hard = false) =>
    api<void>(`/products/${encodeURIComponent(sku)}${hard ? "?hard=1" : ""}`, {
      method: "DELETE",
      auth: true,
    }),

  uploadImages: (sku: string, form: FormData) =>
    api<{ added: number; errors: string[] }>(`/products/${encodeURIComponent(sku)}/images`, {
      method: "POST",
      formData: form,
      auth: true,
    }),

  setImageAlt: (id: number, alt: string) =>
    api<void>(`/products/images/${id}/alt`, { method: "PATCH", body: { alt }, auth: true }),

  moveImage: (id: number, direction: "up" | "down") =>
    api<void>(`/products/images/${id}/move`, { method: "POST", body: { direction }, auth: true }),

  removeImage: (id: number) => api<void>(`/products/images/${id}`, { method: "DELETE", auth: true }),
};

export const catalog = {
  productBySlug: (slug: string) => api<import("@supercomputers/shared").Product>(`/catalog/slug/${encodeURIComponent(slug)}`, { revalidate: 60 }),
};

/* ---------------------------------------------------------------- presets */

export const presets = {
  list: () => api<PresetRow[]>("/presets", { revalidate: 30 }),
  adminList: () => api<PresetRow[]>("/presets/admin/list", { auth: true }),
  bySlug: (slug: string) => api<PresetRow>(`/presets/${encodeURIComponent(slug)}`, { auth: true }),

  create: (body: Record<string, unknown>) =>
    api<PresetRow>("/presets", { method: "POST", body, auth: true }),

  update: (slug: string, body: Record<string, unknown>) =>
    api<PresetRow>(`/presets/${encodeURIComponent(slug)}`, { method: "PATCH", body, auth: true }),

  move: (slug: string, direction: "up" | "down") =>
    api<void>(`/presets/${encodeURIComponent(slug)}/move`, {
      method: "POST",
      body: { direction },
      auth: true,
    }),

  remove: (slug: string) =>
    api<void>(`/presets/${encodeURIComponent(slug)}`, { method: "DELETE", auth: true }),
};

/* ------------------------------------------------------------------ stats */

export interface AdminStats {
  productsTotal: number;
  productsActive: number;
  productsInStock: number;
  quotesTotal: number;
  quotesNew: number;
  usersTotal: number;
}

export const stats = {
  /** The six figures on the admin overview, in one call rather than six. */
  overview: () => api<AdminStats>("/stats", { auth: true }),
};

/* ----------------------------------------------------------------- quotes */

export const quotes = {
  submit: (body: Record<string, unknown>) =>
    api<QuoteRow>("/quotes", { method: "POST", body }),

  mine: () => api<QuoteRow[]>("/quotes/mine", { auth: true }),

  list: (params: Record<string, string | number | undefined> = {}) =>
    api<Page<QuoteRow>>(`/quotes${qs(params)}`, { auth: true }),

  counts: () => api<Record<string, number>>("/quotes/counts", { auth: true }),

  byReference: (reference: string) =>
    api<QuoteRow>(`/quotes/${encodeURIComponent(reference)}`, { auth: true }),

  update: (reference: string, body: { status?: QuoteStatus; internal_note?: string }) =>
    api<QuoteRow>(`/quotes/${encodeURIComponent(reference)}`, { method: "PATCH", body, auth: true }),
};

/* ------------------------------------------------------------------ utils */

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}
