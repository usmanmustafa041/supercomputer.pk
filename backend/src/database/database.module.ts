import { Global, Module } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.token";
import { loadConfiguration } from "../config/configuration";
import { DatabaseService } from "./database.service";
import { SchemaService } from "./schema.service";
import { AuditService } from "../audit.service";
import { DistributedRateLimitGuard } from "../common/distributed-rate-limit.guard";

/**
 * Global, because the configuration and the pool are wanted almost everywhere
 * and threading them through every module's imports would be noise. Nothing
 * else in the application is global.
 */
@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: loadConfiguration },
    DatabaseService,
    SchemaService,
    AuditService,
    DistributedRateLimitGuard,
  ],
  exports: [APP_CONFIG, DatabaseService, AuditService, DistributedRateLimitGuard],
})
export class DatabaseModule {}
