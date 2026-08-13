import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { PresetPick, PresetRow, PresetTarget } from "./preset.types";

const COLUMNS = "id, slug, name, role, target, blurb, picks, position, is_active";

export interface PresetInput {
  name: string;
  role: string;
  target: PresetTarget;
  blurb: string;
  picks: PresetPick[];
  is_active: boolean;
}

@Injectable()
export class PresetsRepository {
  constructor(private readonly db: DatabaseService) {}

  list(includeRetired = false): Promise<PresetRow[]> {
    return this.db.query<PresetRow>(
      `SELECT ${COLUMNS} FROM presets ${includeRetired ? "" : "WHERE is_active"} ORDER BY position, id`,
    );
  }

  findBySlug(slug: string): Promise<PresetRow | null> {
    return this.db.one<PresetRow>(`SELECT ${COLUMNS} FROM presets WHERE slug = $1`, [slug]);
  }

  /** Appends to the end, so a new one does not jump the queue. */
  async create(slug: string, p: PresetInput): Promise<PresetRow> {
    const rows = await this.db.query<PresetRow>(
      `INSERT INTO presets (slug, name, role, target, blurb, picks, position, is_active)
       VALUES ($1, $2, $3, $4, $5, $6,
               COALESCE((SELECT max(position) + 1 FROM presets), 0), $7)
       RETURNING ${COLUMNS}`,
      [slug, p.name, p.role, p.target, p.blurb, JSON.stringify(p.picks), p.is_active],
    );
    return rows[0];
  }

  /** Column names come from a fixed allowlist, never from the caller's keys. */
  async update(slug: string, patch: Partial<PresetInput>): Promise<PresetRow | null> {
    const allowed = new Set(["name", "role", "target", "blurb", "picks", "is_active"]);

    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || !allowed.has(key)) continue;
      params.push(key === "picks" ? JSON.stringify(value) : value);
      sets.push(`${key} = $${params.length}`);
    }
    if (!sets.length) return this.findBySlug(slug);

    sets.push("updated_at = now()");
    params.push(slug);
    const rows = await this.db.query<PresetRow>(
      `UPDATE presets SET ${sets.join(", ")} WHERE slug = $${params.length} RETURNING ${COLUMNS}`,
      params,
    );
    return rows[0] ?? null;
  }

  async remove(slug: string): Promise<void> {
    await this.db.query("DELETE FROM presets WHERE slug = $1", [slug]);
  }

  /** A swap of two positions, the same way image ordering works. */
  async move(slug: string, direction: "up" | "down"): Promise<void> {
    const comparison = direction === "up" ? "<" : ">";
    const order = direction === "up" ? "DESC" : "ASC";

    await this.db.query(
      `WITH me AS (
         SELECT id, position FROM presets WHERE slug = $1
       ),
       neighbour AS (
         SELECT p.id, p.position
           FROM presets p, me
          WHERE (p.position, p.id) ${comparison} (me.position, me.id)
          ORDER BY p.position ${order}, p.id ${order}
          LIMIT 1
       )
       UPDATE presets p
          SET position = CASE WHEN p.id = me.id THEN neighbour.position ELSE me.position END
         FROM me, neighbour
        WHERE p.id IN (me.id, neighbour.id)`,
      [slug],
    );
  }
}
