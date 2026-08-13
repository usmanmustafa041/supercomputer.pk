import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Public, Roles } from "../common/decorators";
import { MAX_UPLOAD_BYTES } from "../storage/storage.service";
import {
  CreateProductDto,
  ImageAltDto,
  ListProductsDto,
  MoveImageDto,
  SetStockDto,
  UpdateProductDto,
} from "./dto";
import { MAX_IMAGES_PER_PRODUCT, ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /* ------------------------------------------------------------ public reads */

  @Public()
  @Get()
  list(@Query() q: ListProductsDto) {
    return this.products.list({
      q: q.q,
      kind: q.kind,
      condition: q.condition,
      inStockOnly: q.stock === "1",
      // Not honoured for anonymous callers: retired products are only listed
      // through the admin endpoint below, which is role gated.
      includeRetired: false,
      page: q.page,
      perPage: q.perPage,
    });
  }

  @Public()
  @Get("counts")
  counts() {
    return this.products.counts();
  }

  @Public()
  @Get("slug/:slug")
  bySlug(@Param("slug") slug: string) {
    return this.products.bySlug(slug);
  }

  @Public()
  @Get(":sku/images")
  images(@Param("sku") sku: string) {
    return this.products.listPublicImages(sku);
  }

  /**
   * The bytes of one photograph.
   *
   * Streamed through the API rather than served from MinIO directly, so the
   * bucket stays private and there is one place that decides who may see what.
   * The key is never accepted from the caller: an id is looked up and the key
   * comes off the row, so there is no path for a caller to name an object.
   */
  @Public()
  @Get("images/:id/raw")
  async raw(@Param("id", ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    const object = await this.products.openImage(id);
    if (!object) {
      res.status(404).send("Not found");
      return;
    }

    res.set({
      "Content-Type": object.contentType,
      "Content-Length": String(object.length),
      // The key is a content hash, so this URL can never return different bytes.
      "Cache-Control": "public, max-age=31536000, immutable",
      // The bytes are whatever was uploaded. Make certain a browser renders
      // them as an image and never as a document inside our own origin.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    });
    object.stream.pipe(res);
  }

  /* ----------------------------------------------------------- admin writes */

  @Roles("admin")
  @Get("admin/list")
  adminList(@Query() q: ListProductsDto) {
    return this.products.list({
      q: q.q,
      kind: q.kind,
      condition: q.condition,
      inStockOnly: q.stock === "1",
      includeRetired: q.includeRetired === "1",
      page: q.page,
      perPage: q.perPage,
    });
  }

  @Roles("admin")
  @Get(":sku")
  bySku(@Param("sku") sku: string) {
    return this.products.bySku(sku);
  }

  @Roles("admin")
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto as never);
  }

  @Roles("admin")
  @Patch(":sku")
  update(@Param("sku") sku: string, @Body() dto: UpdateProductDto) {
    // The SKU is the identity of the row and is fixed once created; accepting a
    // new one in the body would silently rewrite what the URL pointed at.
    const { sku: _ignored, ...patch } = dto;
    return this.products.update(sku, patch as never);
  }

  @Roles("admin")
  @Patch(":sku/stock")
  setStock(@Param("sku") sku: string, @Body() dto: SetStockDto) {
    return this.products.update(sku, { stock_qty: dto.stock_qty });
  }

  @Roles("admin")
  @Post(":sku/restore")
  @HttpCode(204)
  async restore(@Param("sku") sku: string): Promise<void> {
    await this.products.restore(sku);
  }

  /**
   * Retire by default; `?hard=1` really deletes.
   *
   * A product named in an old quote has to stay readable, so hiding it is
   * almost always what is wanted and the destructive version has to be asked
   * for explicitly.
   */
  @Roles("admin")
  @Delete(":sku")
  @HttpCode(204)
  async remove(@Param("sku") sku: string, @Query("hard") hard?: string): Promise<void> {
    if (hard === "1") await this.products.remove(sku);
    else await this.products.retire(sku);
  }

  /* ------------------------------------------------------------ admin images */

  @Roles("admin")
  @Post(":sku/images")
  @UseInterceptors(
    FilesInterceptor("photos", MAX_IMAGES_PER_PRODUCT, {
      // Held in memory, not written to disk: the bytes are inspected and then
      // forwarded to the object store, so a temporary file would only be
      // another thing to clean up and another place to leak.
      limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_IMAGES_PER_PRODUCT },
    }),
  )
  upload(
    @Param("sku") sku: string,
    @UploadedFiles() files: Array<{ buffer: Buffer; originalname?: string }>,
  ) {
    return this.products.addImages(sku, files ?? []);
  }

  @Roles("admin")
  @Patch("images/:id/alt")
  @HttpCode(204)
  async alt(@Param("id", ParseIntPipe) id: number, @Body() dto: ImageAltDto): Promise<void> {
    await this.products.setImageAlt(id, dto.alt);
  }

  @Roles("admin")
  @Post("images/:id/move")
  @HttpCode(204)
  async move(@Param("id", ParseIntPipe) id: number, @Body() dto: MoveImageDto): Promise<void> {
    await this.products.moveImage(id, dto.direction);
  }

  @Roles("admin")
  @Delete("images/:id")
  @HttpCode(204)
  async removeImage(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.products.removeImage(id);
  }
}
