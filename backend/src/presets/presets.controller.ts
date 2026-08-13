import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Public, Roles } from "../common/decorators";
import { CreatePresetDto, MovePresetDto, UpdatePresetDto } from "./dto";
import { PresetsService } from "./presets.service";
import type { PresetInput } from "./presets.repository";

@Controller("presets")
export class PresetsController {
  constructor(private readonly presets: PresetsService) {}

  /** What the configurator offers. Retired ones are never in this list. */
  @Public()
  @Get()
  list() {
    return this.presets.list(false);
  }

  /** Includes retired ones, because this is where they are brought back. */
  @Roles("admin")
  @Get("admin/list")
  adminList() {
    return this.presets.list(true);
  }

  @Roles("admin")
  @Get(":slug")
  bySlug(@Param("slug") slug: string) {
    return this.presets.bySlug(slug);
  }

  @Roles("admin")
  @Post()
  create(@Body() dto: CreatePresetDto) {
    return this.presets.create({
      name: dto.name.trim(),
      role: dto.role?.trim() ?? "",
      target: dto.target as PresetInput["target"],
      blurb: dto.blurb?.trim() ?? "",
      picks: dto.picks,
      is_active: dto.is_active ?? true,
    });
  }

  @Roles("admin")
  @Patch(":slug")
  update(@Param("slug") slug: string, @Body() dto: UpdatePresetDto) {
    return this.presets.update(slug, dto as Partial<PresetInput>);
  }

  @Roles("admin")
  @Post(":slug/move")
  @HttpCode(204)
  async move(@Param("slug") slug: string, @Body() dto: MovePresetDto): Promise<void> {
    await this.presets.move(slug, dto.direction);
  }

  @Roles("admin")
  @Delete(":slug")
  @HttpCode(204)
  async remove(@Param("slug") slug: string): Promise<void> {
    await this.presets.remove(slug);
  }
}
