/**
 * One shape for every error, and nothing leaked in it.
 *
 * Two jobs. It gives the web tier a predictable body to read a message out of,
 * rather than the several shapes Nest produces for validation failures, thrown
 * HttpExceptions and unhandled errors. And it makes sure an unexpected error
 * turns into "Something went wrong" rather than a stack trace or a Postgres
 * message naming columns and constraints, which is free reconnaissance.
 *
 * The real error is logged with a reference, so support can find it from what
 * the customer saw without any of it having been on screen.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ method: string; url: string }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // class-validator puts its complaints in an array; the first is the one
      // worth showing, and the rest are usually the same field.
      let message = exception.message;
      if (typeof body === "object" && body !== null && "message" in body) {
        const m = (body as { message: unknown }).message;
        if (Array.isArray(m) && m.length) message = String(m[0]);
        else if (typeof m === "string") message = m;
      }

      res.status(status).json({ statusCode: status, message });
      return;
    }

    const reference = randomBytes(4).toString("hex");
    this.logger.error(
      `${reference} ${req.method} ${req.url}: ${(exception as Error)?.message}`,
      (exception as Error)?.stack,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: "Something went wrong. Please try again.",
      reference,
    });
  }
}
