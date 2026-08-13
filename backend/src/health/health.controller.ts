import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../common/decorators";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Is the process alive? Nothing more.
   *
   * Kept separate from readiness on purpose. If the database goes away, this
   * still answers 200, because restarting the API would not bring the database
   * back and a container that keeps being killed while its dependency recovers
   * is worse than one sitting there waiting.
   */
  @Public()
  @Get("live")
  live() {
    return { status: "alive" };
  }

  /**
   * Can it actually serve a request? Answers 503 when it cannot, which is what
   * the container healthcheck and any load balancer should be reading.
   */
  @Public()
  @Get()
  async ready(@Res() res: Response): Promise<void> {
    const [database, storage] = await Promise.all([this.db.ping(), this.storage.ping()]);
    const ok = database && storage;
    res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded" });
  }
}
