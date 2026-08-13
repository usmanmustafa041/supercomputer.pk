/**
 * Object storage for uploaded photographs.
 *
 * MinIO in this stack, spoken to over the S3 API. That choice is about where
 * this can go rather than what it does today: the same code and the same
 * credentials point at AWS S3, Cloudflare R2, Backblaze or a managed MinIO by
 * changing three environment variables, so the hosting decision is not baked
 * into the application.
 *
 * What it replaces is a Docker volume of files, which worked but had three
 * problems worth fixing. It tied uploads to one machine's disk, so a second API
 * container could not serve what the first had written. It made backup a
 * separate manual job. And it put a filesystem path into a request handler,
 * which is one traversal bug away from serving /etc/passwd.
 *
 * Keys are the SHA-256 of the file's own contents. That buys three things at
 * once: the same photograph uploaded twice is stored once, keys cannot collide,
 * and because the key changes whenever the bytes do, the object can be cached
 * forever without a stale-content problem.
 *
 * The bucket is private. Nothing is served from MinIO directly; the API streams
 * objects to callers, so access stays behind whatever rules the API applies.
 */

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Readable } from "node:stream";
import { APP_CONFIG } from "../config/config.token";
import type { AppConfig } from "../config/configuration";
import { inspect, type Inspection } from "./image-inspect";

/**
 * 8MB. Large enough for a photograph straight out of a phone camera, small
 * enough that a slow upload on a Pakistani connection still completes.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_PIXELS = 50_000_000;

export interface StoredObject extends Inspection {
  key: string;
  bytes: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client;
  private bucket: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async onModuleInit(): Promise<void> {
    const s = this.config.storage;
    this.bucket = s.bucket;
    this.client = new S3Client({
      endpoint: s.endpoint,
      region: s.region,
      forcePathStyle: s.forcePathStyle,
      credentials: { accessKeyId: s.accessKey, secretAccessKey: s.secretKey },
    });

    await this.ensureBucket();
  }

  /** Creates the bucket on first boot, then checks it is actually private. */
  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`created bucket ${this.bucket}`);
      } catch (e) {
        this.logger.error(`could not create bucket ${this.bucket}: ${(e as Error).message}`);
        return;
      }
    }

    await this.assertPrivate();
  }

  /**
   * Proves that an anonymous caller cannot read the bucket.
   *
   * This started out as a PutBucketPolicy with an explicit deny, which is the
   * conventional answer and was the wrong one here: MinIO implements a subset
   * of the S3 policy language and rejected the condition keys outright, so the
   * policy was never applied and the only thing it produced was a warning that
   * looked like it had been. A policy the store will not accept protects
   * nothing.
   *
   * So this checks the property instead of declaring the intent. An
   * unauthenticated request is made against the bucket, and anything other than
   * a refusal is an error worth shouting about, whichever S3 implementation is
   * behind the endpoint and however it was configured.
   */
  private async assertPrivate(): Promise<void> {
    try {
      const res = await fetch(`${this.config.storage.endpoint}/${this.bucket}/`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 403 || res.status === 401) {
        this.logger.log(`bucket ${this.bucket} refuses anonymous access`);
        return;
      }
      this.logger.error(
        `bucket ${this.bucket} answered an unauthenticated request with ${res.status}. ` +
          "It may be publicly readable. Check the bucket policy before going near production.",
      );
      if (this.config.nodeEnv === "production") {
        throw new Error(`Storage bucket ${this.bucket} is not private.`);
      }
    } catch (e) {
      // Could not ask. Not a reason to refuse to start, but not a clean bill of
      // health either, so it does not claim one.
      this.logger.warn(`could not verify that ${this.bucket} is private: ${(e as Error).message}`);
    }
  }

  /**
   * Stores the bytes, if they really are an image we accept.
   *
   * Returns what was stored rather than throwing, so a caller uploading five
   * files can report which one was the problem instead of losing the batch.
   */
  async putImage(buf: Buffer): Promise<StoredObject | { error: string }> {
    if (buf.length === 0) return { error: "The file is empty." };
    if (buf.length > MAX_UPLOAD_BYTES) {
      return { error: `That is ${(buf.length / 1024 / 1024).toFixed(1)}MB. The limit is 8MB per photo.` };
    }

    const found = inspect(buf);
    if (!found) return { error: "That is not a JPEG, PNG or WebP image." };
    if (found.width && found.height && found.width * found.height > MAX_UPLOAD_PIXELS) {
      return { error: "That image has too many pixels." };
    }

    const digest = createHash("sha256").update(buf).digest("hex").slice(0, 32);
    const key = `products/${digest}.${found.extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buf,
        ContentType: found.mime,
        // The key is a content hash, so the bytes behind it can never change.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return { key, bytes: buf.length, ...found };
  }

  /** Streamed, so a dozen people opening one page does not put a dozen copies in the heap. */
  async getObject(key: string): Promise<{ stream: Readable; contentType: string; length: number } | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return {
        stream: res.Body as Readable,
        contentType: res.ContentType ?? "application/octet-stream",
        length: res.ContentLength ?? 0,
      };
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (e) {
      // Already gone, or never written. The row is what mattered.
      this.logger.warn(`could not delete ${key}: ${(e as Error).message}`);
    }
  }

  /** Used by the health check, so "up" includes "can reach the object store". */
  async ping(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
