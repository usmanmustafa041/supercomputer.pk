import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { ProductsModule } from "../products/products.module";

@Module({
  imports: [ProductsModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
