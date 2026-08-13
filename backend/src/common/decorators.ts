import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Role, SessionUser } from "../auth/auth.types";

export const IS_PUBLIC = "auth:public";
export const REQUIRED_ROLES = "auth:roles";

/**
 * Opens an endpoint to callers with no session.
 *
 * Note which way round this is. The guard is global and everything is closed
 * unless it says otherwise, so forgetting to annotate a new endpoint leaves it
 * locked rather than open. The opposite arrangement fails silently and in the
 * wrong direction.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Requires a signed-in user with one of these roles. */
export const Roles = (...roles: Role[]) => SetMetadata(REQUIRED_ROLES, roles);

/** The user the guard resolved, injected into a handler argument. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser | null =>
    ctx.switchToHttp().getRequest().user ?? null,
);

/** The raw bearer token, needed by sign-out to delete the right row. */
export const BearerToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null =>
    ctx.switchToHttp().getRequest().sessionToken ?? null,
);
