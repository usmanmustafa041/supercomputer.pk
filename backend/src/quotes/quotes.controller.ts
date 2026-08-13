import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Public, Roles } from "../common/decorators";
import type { SessionUser } from "../auth/auth.types";
import { ListQuotesDto, SubmitQuoteDto, UpdateQuoteDto } from "./dto";
import { QuotesService } from "./quotes.service";

@Controller("quotes")
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  /**
   * Anyone can ask for a price, so this is open. Rate limited because an open
   * write endpoint is the one an abusive script goes for first.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  submit(@Body() dto: SubmitQuoteDto, @CurrentUser() user: SessionUser | null) {
    return this.quotes.submit({ ...dto, userId: user?.id ?? null });
  }

  /** A customer's own requests. Scoped to the caller, never to a supplied id. */
  @Get("mine")
  mine(@CurrentUser() user: SessionUser) {
    return this.quotes.mine(user.id);
  }

  @Roles("admin")
  @Get()
  list(@Query() q: ListQuotesDto) {
    return this.quotes.list(q);
  }

  @Roles("admin")
  @Get("counts")
  counts() {
    return this.quotes.counts();
  }

  @Roles("admin")
  @Get(":reference")
  byReference(@Param("reference") reference: string) {
    return this.quotes.byReference(reference);
  }

  @Roles("admin")
  @Patch(":reference")
  update(@Param("reference") reference: string, @Body() dto: UpdateQuoteDto) {
    return this.quotes.update(reference, dto);
  }
}
