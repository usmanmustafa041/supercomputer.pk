import assert from "node:assert/strict";
import { createTotpSecret, totpCode, verifyTotp } from "../src/auth/totp";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { AuthGuard } from "../src/common/auth.guard";
import { IS_PUBLIC, REQUIRED_ROLES } from "../src/common/decorators";

(async () => {
  const secret = createTotpSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.equal(verifyTotp(secret, totpCode(secret)), true);
  assert.equal(verifyTotp(secret, "000000"), false);
  const hash = await hashPassword("a-strong-test-password");
  assert.equal(await verifyPassword("a-strong-test-password", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);

  const publicHandler = () => undefined;
  const adminHandler = () => undefined;
  const reflector = {
    getAllAndOverride: (key: string, targets: unknown[]) => {
      if (key === IS_PUBLIC) return targets.includes(publicHandler) ? true : undefined;
      if (key === REQUIRED_ROLES) return targets.includes(adminHandler) ? ["admin"] : undefined;
      return undefined;
    },
  };
  const auth = { resolve: async () => ({ id: 7, email: "admin@example.test", role: "admin" }) };
  const config = { auth: { internalKey: "internal-secret" } };
  const guard = new AuthGuard(reflector as never, auth as never, config as never);
  const context = (request: Record<string, unknown>, handler: unknown) => ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => class TestController {},
  }) as never;
  await assert.rejects(() => guard.canActivate(context({ path: "/private", headers: {} }, () => undefined)), /recognised caller/);
  await assert.rejects(() => guard.canActivate(context({ path: "/private", headers: { "x-internal-key": "internal-secret" } }, () => undefined)), /Sign in/);
  assert.equal(await guard.canActivate(context({ path: "/admin", headers: { "x-internal-key": "internal-secret", authorization: "Bearer token" } }, adminHandler)), true);
  console.log("security primitives passed");
})();
