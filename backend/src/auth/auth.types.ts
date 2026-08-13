export type Role = "admin" | "customer";

/** Everything the web tier is allowed to know about who is signed in. */
export interface SessionUser {
  id: number;
  email: string;
  role: Role;
  fullName: string | null;
  organisation: string | null;
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string | null;
  organisation: string | null;
  phone: string | null;
  role: Role;
  is_active: boolean;
  email_verified?: boolean;
  mfa_enabled?: boolean;
  mfa_secret?: string | null;
  created_at: Date;
}
