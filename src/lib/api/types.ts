/**
 * Friendly names for the shapes in schema.d.ts.
 *
 * schema.d.ts is generated, never edited by hand:
 *
 *     npm run api:types      (with the API running)
 *
 * It is read straight out of the API's own OpenAPI document, so the frontend
 * cannot drift away from the backend without the TypeScript build failing.
 * That is the whole point of it: two languages describing one set of records is
 * the main risk of splitting the app in two, and this closes it.
 */

import type { components } from "./schema";

type S = components["schemas"];

export type User = S["UserOut"];
export type Product = S["ProductOut"];
export type ProductPage = S["ProductPage"];
export type ProductCreate = S["ProductCreate"];
export type ProductUpdate = S["ProductUpdate"];
export type Quote = S["QuoteOut"];
export type QuotePage = S["QuotePage"];
export type QuoteCreate = S["QuoteCreate"];
export type Stats = S["Stats"];
export type Role = S["Role"];
export type QuoteStatus = S["QuoteStatus"];

/** Everything the browser is allowed to know about who is signed in. */
export type Session = {
  id: number;
  email: string;
  role: Role;
  fullName: string | null;
  organisation: string | null;
};

export function toSession(u: User): Session {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.full_name ?? null,
    organisation: u.organisation ?? null,
  };
}

/** Human labels. The API's values are lowercase identifiers, not display text. */
export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  new: "New",
  in_review: "Being reviewed",
  quoted: "Quote sent",
  won: "Ordered",
  lost: "Closed",
};
