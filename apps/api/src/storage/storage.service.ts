import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, S3Error } from 'minio';
import type { Readable } from 'node:stream';

// The only thing that talks to MinIO. Files reach the browser through the
// api's permission checks, never through MinIO directly.
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.client = new Client({
      endPoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
      port: Number(config.getOrThrow<string>('MINIO_PORT')),
      useSSL: false,
      accessKey: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET');
  }

  // Creates the bucket once. Several instances may start together (e2e
  // workers), so losing that race is not an error.
  async onModuleInit() {
    if (await this.client.bucketExists(this.bucket)) return;
    try {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket "${this.bucket}"`);
    } catch (error) {
      if (!(
        error instanceof S3Error && error.code === 'BucketAlreadyOwnedByYou'
      )) {
        throw error;
      }
    }
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<void> {
    await this.client.putObject(this.bucket, key, data, data.length, {
      'Content-Type': mimeType,
    });
  }

  // Whole object, or a byte range for audio scrubbing.
  get(key: string, range?: { start: number; end: number }): Promise<Readable> {
    if (!range) return this.client.getObject(this.bucket, key);
    return this.client.getPartialObject(
      this.bucket,
      key,
      range.start,
      range.end - range.start + 1,
    );
  }

  remove(key: string): Promise<void> {
    return this.client.removeObject(this.bucket, key);
  }
}
