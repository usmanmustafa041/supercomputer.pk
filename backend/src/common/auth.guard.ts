/**
 * The gate on every request.
 *
 * Registered globally, so an endpoint is closed unless it is marked @Public().
 * A new controller added without thinking about auth is therefore unreachable
 * rather than wide open, which is the failure worth having.
 *
 * It does two separate jobs and they should not be confused with each other:
 *
 *   1. Is this caller allowed to talk to the API at all? That is the internal
 *      key, which the web tier holds and a browser never sees.
 *   2. Which user is this request acting as? That is the bearer token, which
 *      the web tier reads out of its own httpOnly cookie and forwards.
 *
 * The first is about the network boundary, the second about authorisation.
 * Passing one does not imply the other.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { timingSafeEqual } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { APP_CONFIG } from "../config/config.token";
import type { AppConfig } from "../config/configuration";
import type { Role } from "../auth/auth.types";
import { IS_PUBLIC, REQUIRED_ROLES } from "./decorators";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // The health check answers before anything else, because the container
    // orchestrator has no credentials and should not need any to ask whether
    // the process is alive.
    if (request.path === "/health" || request.path === "/health/live") return true;

    this.checkCaller(request);

    const token = this.bearer(request);
    if (token) {
      const user = await this.auth.resolve(token);
      if (user) {
        request.user = user;
        request.sessionToken = token;
      }
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const roles = this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic && !roles?.length) return true;

    if (!request.user) throw new UnauthorizedException("Sign in to do that.");
    if (roles?.length && !roles.includes(request.user.role)) {
      throw new ForbiddenException("You do not have access to that.");
    }
    return true;
  }

  /**
   * Is the caller the web tier?
   *
   * Compared in constant time. A plain === leaks how much of the key was right
   * through how long the comparison took, which over enough requests recovers
   * it a byte at a time.
   */
  private checkCaller(request: { headers: Record<string, unknown> }): void {
    const expected = this.config.auth.internalKey;
    if (!expected) return; // Not configured: single-process development.

    const given = String(request.headers["x-internal-key"] ?? "");
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException("Not a recognised caller.");
    }
  }

  private bearer(request: { headers: Record<string, unknown> }): string | null {
    const header = String(request.headers.authorization ?? "");
    if (!header.toLowerCase().startsWith("bearer ")) return null;
    const token = header.slice(7).trim();
    return token || null;
  }
}
