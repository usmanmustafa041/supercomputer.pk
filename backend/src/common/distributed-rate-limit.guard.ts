import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
@Injectable()
export class DistributedRateLimitGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ ip?: string; path?: string }>();
    const key = `${req.ip ?? "unknown"}:${req.path ?? "unknown"}`.slice(0, 240);
    const result = await this.db.one<{ hits: number }>(`INSERT INTO rate_limits(key, window_start, hits) VALUES ($1,date_trunc('minute',now()),1) ON CONFLICT (key) DO UPDATE SET hits=CASE WHEN rate_limits.window_start < date_trunc('minute',now()) THEN 1 ELSE rate_limits.hits+1 END, window_start=CASE WHEN rate_limits.window_start < date_trunc('minute',now()) THEN date_trunc('minute',now()) ELSE rate_limits.window_start END RETURNING hits`, [key]);
    if ((result?.hits ?? 0) > 300) throw new HttpException("Too many requests. Try again shortly.", HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
