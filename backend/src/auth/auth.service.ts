/**
 * Who is signed in, and how they got there.
 *
 * Sessions are opaque tokens in a table, not signed tokens. A JWT cannot be
 * withdrawn: revoking one means keeping a list of the revoked, which is a
 * session table with extra steps and a worse failure mode. Here, signing out
 * deletes a row and takes effect immediately, and so does disabling an account.
 *
 * The token means nothing on its own. Nobody can read their own role out of it,
 * let alone change it.
 */

import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { APP_CONFIG } from "../config/config.token";
import type { AppConfig } from "../config/configuration";
import { DatabaseService } from "../database/database.service";
import { hashPassword, verifyPassword } from "./password";
import type { SessionUser, UserRow } from "./auth.types";
import { createTotpSecret, verifyTotp } from "./totp";
import { EmailService } from "./email.service";
import { AuditService } from "../audit.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  /**
   * The same message whichever half is wrong.
   *
   * Saying "no such account" tells anyone who asks which addresses are
   * registered, which is a list worth having if you are about to try passwords
   * against them.
   */
  private readonly rejection = "Email or password is incorrect.";

  async signIn(email: string, password: string, mfaCode?: string): Promise<{ token: string; user: SessionUser }> {
    const row = await this.db.one<UserRow>(
      "SELECT * FROM users WHERE email = $1",
      [email.trim().toLowerCase()],
    );

    // Verify even when the account does not exist, against a throwaway hash, so
    // a missing account and a wrong password take the same time to answer.
    // Without it the difference is measurable and enumerates the user list.
    const hash = row?.password_hash ?? (await hashPassword(randomBytes(16).toString("hex")));
    const ok = await verifyPassword(password, hash);

    if (!row || !ok || !row.is_active) throw new UnauthorizedException(this.rejection);
    if (row.role === "admin" && row.mfa_enabled && (!mfaCode || !row.mfa_secret || !verifyTotp(row.mfa_secret, mfaCode))) throw new UnauthorizedException("A valid administrator authenticator code is required.");

    const token = await this.createSession(row.id);
    await this.audit.record(row.id, "sign_in", "user", String(row.id));
    return { token, user: this.toSessionUser(row) };
  }

  async register(input: {
    email: string;
    password: string;
    fullName?: string;
    organisation?: string;
    phone?: string;
  }): Promise<{ token: string; user: SessionUser }> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.db.scalar<number>("SELECT id FROM users WHERE email = $1", [email]);
    if (existing) {
      // Deliberately the same wording a caller gets for a bad sign-in, so this
      // endpoint cannot be used to test whether an address is registered.
      throw new UnauthorizedException("That email address cannot be registered.");
    }

    // Role is not accepted from the request. Self-registration always produces
    // a customer; an administrator is made by another administrator or by the
    // bootstrap in SchemaService.
    const rows = await this.db.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, organisation, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       RETURNING *`,
      [
        email,
        await hashPassword(input.password),
        input.fullName?.trim() || null,
        input.organisation?.trim() || null,
        input.phone?.trim() || null,
      ],
    );

    const user = rows[0];
    const token = await this.createSession(user.id);
    const verification = await this.issueToken(user.id, "verify_email", 24);
    await this.email.send(email, "Verify your Supercomputers account", `Open /verify-email?token=${verification}`);
    return { token, user: this.toSessionUser(user) };
  }

  async setupMfa(user: SessionUser) { if (user.role !== "admin") throw new ForbiddenException(); const secret = createTotpSecret(); await this.db.query("UPDATE users SET mfa_secret=$1,mfa_enabled=FALSE,updated_at=now() WHERE id=$2", [secret, user.id]); return { secret, otpauth: `otpauth://totp/Supercomputers:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Supercomputers` }; }
  async enableMfa(user: SessionUser, code: string): Promise<void> { const row = await this.db.one<{mfa_secret:string|null}>("SELECT mfa_secret FROM users WHERE id=$1", [user.id]); if (!row?.mfa_secret || !verifyTotp(row.mfa_secret, code)) throw new BadRequestException("Invalid authenticator code."); await this.db.query("UPDATE users SET mfa_enabled=TRUE,updated_at=now() WHERE id=$1", [user.id]); await this.audit.record(user.id,"mfa_enabled","user",String(user.id)); }
  async verifyEmail(token: string): Promise<void> { await this.consumeToken(token, "verify_email"); }
  async requestPasswordReset(email: string): Promise<void> { const user = await this.db.one<{id:number;email:string}>("SELECT id,email FROM users WHERE email=$1 AND is_active", [email.trim().toLowerCase()]); if (!user) return; const token = await this.issueToken(user.id,"reset_password",1); await this.email.send(user.email,"Reset your Supercomputers password",`Open /reset-password?token=${token}`); }
  async resetPassword(token: string, password: string): Promise<void> { const userId = await this.consumeToken(token,"reset_password"); await this.db.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2", [await hashPassword(password),userId]); await this.db.query("DELETE FROM sessions WHERE user_id=$1",[userId]); await this.audit.record(userId,"password_reset","user",String(userId)); }

  async createSession(userId: number): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(token);
    await this.db.query(
      `INSERT INTO sessions (token, user_id, expires_at)
       VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
      [tokenHash, userId, String(this.config.auth.sessionDays)],
    );

    // Opportunistic tidy-up. Cheap, indexed, and saves needing a scheduled job
    // for the one housekeeping task this application has.
    await this.db.query("DELETE FROM sessions WHERE expires_at < now()");
    return token;
  }

  async signOut(token: string): Promise<void> {
    await this.db.query("DELETE FROM sessions WHERE token = $1", [this.hashToken(token)]);
  }

  /** Resolves a bearer token to a user, or null. Used by the guard. */
  async resolve(token: string): Promise<SessionUser | null> {
    const row = await this.db.one<UserRow>(
      `SELECT u.id, u.email, u.full_name, u.organisation, u.role, u.is_active
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = $1
          AND s.expires_at > now()
          AND u.is_active`,
      [this.hashToken(token)],
    );
    return row ? this.toSessionUser(row) : null;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async issueToken(userId: number, purpose: "verify_email"|"reset_password", hours: number): Promise<string> { const token=randomBytes(32).toString("base64url"); await this.db.query("INSERT INTO auth_tokens(user_id,token_hash,purpose,expires_at) VALUES($1,$2,$3,now()+($4 || ' hours')::interval)",[userId,this.hashToken(token),purpose,String(hours)]); return token; }
  private async consumeToken(token: string, purpose: "verify_email"|"reset_password"): Promise<number> { const row=await this.db.one<{user_id:number}>("UPDATE auth_tokens SET used_at=now() WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at>now() RETURNING user_id",[this.hashToken(token),purpose]); if(!row) throw new BadRequestException("That link is invalid or expired."); if(purpose === "verify_email") await this.db.query("UPDATE users SET email_verified=TRUE,updated_at=now() WHERE id=$1",[row.user_id]); return row.user_id; }

  private toSessionUser(row: UserRow): SessionUser {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      fullName: row.full_name,
      organisation: row.organisation,
    };
  }
}
