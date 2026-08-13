import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
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

const TARGETS = ["desk", "rack", "cluster"] as const;

export class PresetPickDto {
  @IsString() @MinLength(1) @MaxLength(120)
  family: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(64)
  qty: number;

  @IsOptional() @IsString() @MaxLength(120)
  variant?: string;
}

export class CreatePresetDto {
  @IsString() @MinLength(1) @MaxLength(120)
  name: string;

  @IsOptional() @IsString() @MaxLength(120)
  role?: string;

  @IsIn(TARGETS as unknown as string[])
  target: string;

  @IsOptional() @IsString() @MaxLength(2000)
  blurb?: string;

  /**
   * Validated element by element, not just as "an array".
   *
   * These are stored as JSONB and later resolved against the catalogue, so a
   * malformed entry would sit in the database until somebody loaded the preset
   * and got a configuration with a hole in it.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresetPickDto)
  picks: PresetPickDto[];

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

export class UpdatePresetDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(120)
  role?: string;

  @IsOptional() @IsIn(TARGETS as unknown as string[])
  target?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  blurb?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresetPickDto)
  picks?: PresetPickDto[];

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

export class MovePresetDto {
  @IsIn(["up", "down"])
  direction: "up" | "down";
}
