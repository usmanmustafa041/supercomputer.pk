import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class QuoteLineDto {
  @IsString() @MinLength(1) @MaxLength(64)
  sku: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(64)
  qty: number;
}

export class SubmitQuoteDto {
  @IsString() @MinLength(2) @MaxLength(120)
  contact_name: string;

  @IsEmail({}, { message: "That is not an email address." })
  @MaxLength(200)
  contact_email: string;

  @IsOptional() @IsString() @MaxLength(120)
  organisation?: string;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(80)
  city?: string;

  @IsOptional() @IsString() @MaxLength(80)
  timeline?: string;

  @IsOptional() @IsIn(["desk", "rack", "cluster"])
  target?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  workloads?: string[];

  @IsOptional() @IsString() @MaxLength(5000)
  notes?: string;

  /**
   * Only the SKU and the quantity are accepted.
   *
   * Everything else about a line, and the whole summary and findings, are
   * worked out on the server from the catalogue. A caller cannot describe a
   * part into existence or claim a build passes when it does not.
   */
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines: QuoteLineDto[];
}

export class UpdateQuoteDto {
  @IsOptional() @IsIn(["new", "in_review", "quoted", "won", "lost"])
  status?: "new" | "in_review" | "quoted" | "won" | "lost";

  @IsOptional() @IsString() @MaxLength(5000)
  internal_note?: string;
}

export class ListQuotesDto {
  @IsOptional() @IsIn(["new", "in_review", "quoted", "won", "lost"])
  status?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  perPage?: number;
}
