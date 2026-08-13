import { IsEmail, IsOptional, IsString, MaxLength, MinLength, Matches } from "class-validator";

/**
 * What the API will accept, stated once and enforced by the pipe.
 *
 * The global ValidationPipe runs with whitelist and forbidNonWhitelisted, so a
 * field that is not declared here is not quietly ignored, it is refused. That
 * is what stops a caller posting `role: "admin"` alongside a registration and
 * hoping something downstream spreads the object into an insert.
 */

export class SignInDto {
  @IsEmail({}, { message: "That is not an email address." })
  @MaxLength(200)
  email: string;

  @IsString()
  @MinLength(1, { message: "Enter your password." })
  @MaxLength(200)
  password: string;

  @IsOptional() @IsString() @Matches(/^\d{6}$/)
  mfaCode?: string;
}

export class MfaCodeDto { @IsString() @Matches(/^\d{6}$/) code: string; }
export class PasswordResetRequestDto { @IsEmail() @MaxLength(200) email: string; }
export class PasswordResetConfirmDto { @IsString() @MinLength(12) @MaxLength(200) password: string; @IsString() @MaxLength(200) token: string; }

export class RegisterDto {
  @IsEmail({}, { message: "That is not an email address." })
  @MaxLength(200)
  email: string;

  /**
   * Twelve, not eight.
   *
   * Length is the only thing a rule can enforce that reliably costs an attacker
   * anything. Demanding a symbol and a digit mostly produces Password1! and a
   * sticky note.
   */
  @IsString()
  @MinLength(12, { message: "Use at least 12 characters." })
  @MaxLength(200)
  password: string;

  @IsOptional() @IsString() @MaxLength(120)
  fullName?: string;

  @IsOptional() @IsString() @MaxLength(120)
  organisation?: string;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;
}
