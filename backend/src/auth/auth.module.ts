import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailService],
  // The global guard resolves tokens through this, so it has to be visible
  // outside its own module.
  exports: [AuthService],
})
export class AuthModule {}
