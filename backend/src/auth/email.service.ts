import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.token";
import type { AppConfig } from "../config/configuration";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
  async send(to: string, subject: string, text: string): Promise<void> {
    const webhook = this.config.email.webhookUrl;
    if (webhook) {
      const res = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, from: this.config.email.from, subject, text }), signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
      return;
    }
    if (this.config.nodeEnv === "production") throw new Error("Email delivery is not configured.");
    this.logger.warn(`DEVELOPMENT EMAIL to=${to} subject=${subject} body=${text}`);
  }
}
