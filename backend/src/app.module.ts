import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { AuthGuard } from "./common/auth.guard";
import { DistributedRateLimitGuard } from "./common/distributed-rate-limit.guard";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { PresetsModule } from "./presets/presets.module";
import { ProductsModule } from "./products/products.module";
import { QuotesModule } from "./quotes/quotes.module";
import { StatsModule } from "./stats/stats.module";
import { StorageModule } from "./storage/storage.module";
import { AuditController } from "./audit.controller";

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    /**
     * A ceiling on how fast any one caller can hammer the API. Individual
     * endpoints tighten it: sign-in and quote submission are far lower, because
     * they are the two an abusive script goes for.
     */
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuthModule,
    CatalogModule,
    ProductsModule,
    PresetsModule,
    QuotesModule,
    StatsModule,
    HealthModule,
  ],
  providers: [
    /**
     * Both guards are global, and the order matters: the throttler runs first,
     * so a flood of unauthenticated requests is turned away before any of them
     * reaches the database to have its token looked up.
     */
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: DistributedRateLimitGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  controllers: [AuditController],
})
export class AppModule {}
