import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { APP_CONFIG } from "./config/config.token";
import type { AppConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  // Typed as the Express application, because trust proxy is an Express
  // setting and the platform-agnostic interface does not expose it.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get<AppConfig>(APP_CONFIG);
  const logger = new Logger("Bootstrap");

  /**
   * Sensible response headers. Most of what helmet sets matters more for a page
   * than an API, but nosniff and the frame guards cost nothing and the API does
   * stream image bytes, which is exactly the case where a browser guessing at
   * content type is a problem.
   */
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));

  /**
   * Everything crossing the boundary is validated and stripped.
   *
   * whitelist drops fields no DTO declares, and forbidNonWhitelisted refuses
   * the request outright rather than silently ignoring them: a caller sending
   * `role: "admin"` alongside a registration gets a 400, not a quiet success.
   * transform turns query strings into the numbers and booleans the DTOs say
   * they are.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  /**
   * No CORS. Nothing here is called from a browser: the web tier calls it
   * server to server inside the compose network, so there is no origin to allow
   * and the API is not published outside that network at all.
   */

  // Behind the web tier, which is behind whatever runs in front of it in a real
  // deployment. Trusting the proxy is what makes rate limiting see the caller's
  // address rather than the proxy's.
  app.set("trust proxy", 1);

  app.enableShutdownHooks();

  await app.listen(config.port, "0.0.0.0");
  logger.log(`API listening on ${config.port} in ${config.nodeEnv} mode`);
  if (!config.auth.internalKey) {
    logger.warn("INTERNAL_API_KEY is not set: any caller that can reach this port may use it");
  }
}

void bootstrap();
