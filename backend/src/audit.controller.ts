import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "./common/decorators";
import { AuditService } from "./audit.service";
@Controller("admin/audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Roles("admin") @Get() list(@Query("limit") limit?: string) { return this.audit.list(Number(limit) || 100); }
}
