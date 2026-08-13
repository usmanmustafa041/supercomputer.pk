import { Type } from "class-transformer";
import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const KINDS = [
  "gpu", "cpu", "motherboard", "memory", "storage", "psu", "chassis", "cooler",
  "nic", "switch", "optic", "rack", "pdu", "ups", "system",
] as const;

const CONDITIONS = [
  "new", "refurb-a", "refurb-b", "recertified", "open-box", "tested-pull",
] as const;

const SEGMENTS = ["datacenter", "workstation", "desktop", "edge"] as const;

export class CreateProductDto {
  @IsString() @MinLength(1) @MaxLength(64)
  sku: string;

  @IsOptional() @IsString() @MaxLength(200)
  slug?: string;

  @IsIn(KINDS as unknown as string[])
  kind: string;

  @IsString() @MinLength(1) @MaxLength(120)
  brand: string;

  @IsString() @MinLength(1) @MaxLength(200)
  model: string;

  @IsOptional() @IsString() @MaxLength(120)
  mpn?: string | null;

  @IsOptional() @IsString() @MaxLength(120)
  family?: string;

  @IsIn(CONDITIONS as unknown as string[])
  condition: string;

  @IsIn(SEGMENTS as unknown as string[])
  segment: string;

  /** Never shown on the storefront. Held for the company's own records. */
  @IsOptional() @IsNumber() @Min(0) @Max(1_000_000_000)
  price_pkr?: number;

  @IsOptional() @IsBoolean()
  price_on_request?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(100_000)
  stock_qty?: number;

  @IsOptional() @IsInt() @Min(0) @Max(3650)
  lead_days?: number;

  @IsOptional() @IsBoolean()
  indent_only?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(600)
  warranty_months?: number;

  @IsOptional() @IsInt() @Min(1990) @Max(2100)
  release_year?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) @MaxLength(240, { each: true })
  highlights?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(80) @IsString({ each: true }) @MaxLength(80, { each: true })
  tags?: string[];

  /**
   * Per-category engineering figures, shape decided by the category.
   *
   * The one place a free-form object is accepted, because a graphics card and a
   * power supply have nothing in common to put in a fixed schema. It is stored
   * as JSONB and only ever read by the compatibility engine, never interpolated
   * into SQL or rendered as markup.
   */
  @IsOptional() @IsObject()
  specs?: Record<string, unknown>;

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

/** Same fields, all optional. The SKU is fixed once created. */
export class UpdateProductDto extends CreateProductDto {
  @IsOptional() @IsString() @MaxLength(64)
  declare sku: string;

  @IsOptional() @IsIn(KINDS as unknown as string[])
  declare kind: string;

  @IsOptional() @IsString() @MaxLength(120)
  declare brand: string;

  @IsOptional() @IsString() @MaxLength(200)
  declare model: string;

  @IsOptional() @IsIn(CONDITIONS as unknown as string[])
  declare condition: string;

  @IsOptional() @IsIn(SEGMENTS as unknown as string[])
  declare segment: string;
}

export class ListProductsDto {
  @IsOptional() @IsString() @MaxLength(120)
  q?: string;

  @IsOptional() @IsIn(KINDS as unknown as string[])
  kind?: string;

  @IsOptional() @IsIn(CONDITIONS as unknown as string[])
  condition?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  /** Capped, so one request cannot ask for the whole table. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  perPage?: number;

  @IsOptional() @IsString()
  stock?: string;

  @IsOptional() @IsString()
  includeRetired?: string;
}

export class SetStockDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(100_000)
  stock_qty: number;
}

export class ImageAltDto {
  @IsString() @MaxLength(200)
  alt: string;
}

export class MoveImageDto {
  @IsIn(["up", "down"])
  direction: "up" | "down";
}
