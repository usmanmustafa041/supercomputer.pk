import { Module } from "@nestjs/common";
import { PresetsController } from "./presets.controller";
import { PresetsRepository } from "./presets.repository";
import { PresetsService } from "./presets.service";

@Module({
  controllers: [PresetsController],
  providers: [PresetsService, PresetsRepository],
  exports: [PresetsService],
})
export class PresetsModule {}
