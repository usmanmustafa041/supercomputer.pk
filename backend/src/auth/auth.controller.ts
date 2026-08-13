import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto, SignInDto } from "./dto";
import { BearerToken, CurrentUser, Public, Roles } from "../common/decorators";
import type { SessionUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Five attempts a minute per caller.
   *
   * Rate limiting is the only defence here that scales: a long password helps
   * one account, this helps every account at once, and it is what turns a
   * credential-stuffing run from an afternoon's work into an unreasonable one.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("sign-in")
  @HttpCode(200)
  signIn(@Body() dto: SignInDto) {
    return this.auth.signIn(dto.email, dto.password, dto.mfaCode);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public() @Post("verify-email") @HttpCode(204)
  async verifyEmail(@Body("token") token: string): Promise<void> { await this.auth.verifyEmail(token); }
  @Public() @Post("password-reset/request") @HttpCode(204)
  async requestReset(@Body() dto: import("./dto").PasswordResetRequestDto): Promise<void> { await this.auth.requestPasswordReset(dto.email); }
  @Public() @Post("password-reset/confirm") @HttpCode(204)
  async confirmReset(@Body() dto: import("./dto").PasswordResetConfirmDto): Promise<void> { await this.auth.resetPassword(dto.token,dto.password); }
  @Roles("admin") @Post("mfa/setup") setupMfa(@CurrentUser() user: SessionUser) { return this.auth.setupMfa(user); }
  @Roles("admin") @Post("mfa/enable") @HttpCode(204)
  async enableMfa(@CurrentUser() user: SessionUser, @Body() dto: import("./dto").MfaCodeDto): Promise<void> { await this.auth.enableMfa(user,dto.code); }

  @Post("sign-out")
  @HttpCode(204)
  async signOut(@BearerToken() token: string | null): Promise<void> {
    if (token) await this.auth.signOut(token);
  }

  /** Who the bearer token belongs to. The web tier asks on every render. */
  @Get("me")
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }
}
