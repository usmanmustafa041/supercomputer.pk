import { Injectable } from "@nestjs/common";
import { DatabaseService } from "./database/database.service";
@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}
  async record(userId: number | null, action: string, entity: string, entityId: string | null, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.db.query("INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata) VALUES ($1,$2,$3,$4,$5)", [userId, action, entity, entityId, JSON.stringify(metadata)]);
  }
  list(limit = 100) { return this.db.query("SELECT id,user_id,action,entity,entity_id,metadata,created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1", [Math.min(limit, 500)]); }
}
