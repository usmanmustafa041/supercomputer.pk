import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PresetsRepository, type PresetInput } from "./presets.repository";
import type { PresetRow } from "./preset.types";

@Injectable()
export class PresetsService {
  constructor(private readonly repo: PresetsRepository) {}

  list(includeRetired = false): Promise<PresetRow[]> {
    return this.repo.list(includeRetired);
  }

  async bySlug(slug: string): Promise<PresetRow> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw new NotFoundException("No such configuration.");
    return row;
  }

  private slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  /**
   * A name collision is likelier than it sounds: "Atlas 200" saved twice on the
   * same afternoon. Rather than refuse the save, number it.
   */
  async create(input: PresetInput): Promise<PresetRow> {
    if (input.picks.length === 0) {
      throw new BadRequestException("There is nothing configured to save.");
    }

    const base = this.slugify(input.name) || "configuration";
    let slug = base;
    for (let n = 2; await this.repo.findBySlug(slug); n++) slug = `${base}-${n}`;

    return this.repo.create(slug, input);
  }

  async update(slug: string, patch: Partial<PresetInput>): Promise<PresetRow> {
    const row = await this.repo.update(slug, patch);
    if (!row) throw new NotFoundException("No such configuration.");
    return row;
  }

  remove(slug: string): Promise<void> {
    return this.repo.remove(slug);
  }

  move(slug: string, direction: "up" | "down"): Promise<void> {
    return this.repo.move(slug, direction);
  }
}
