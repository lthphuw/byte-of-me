import type { S3Client } from '@aws-sdk/client-s3';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { createS3Client } from './s3.factory';
import type { StorageConfig, UploadFileParams } from './storage.interface';

type SignUrl = typeof getSignedUrl;

export class Storage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicEndpoint: string;
  private readonly signUrl: SignUrl;

  constructor(config: StorageConfig, client?: S3Client, signUrl?: SignUrl) {
    this.client = client ?? createS3Client(config);
    this.bucket = config.bucket;
    this.publicEndpoint = config.publicEndpoint.replace(/\/$/, '');
    this.signUrl = signUrl ?? getSignedUrl;
  }

  async uploadFile(params: UploadFileParams) {
    const { fileKey, body, contentType } = params;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: body,
        ContentType: contentType,
      })
    );

    return { fileKey };
  }

  async deleteFile(key: string) {
    return this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  /**
   * Reads an object from a private bucket (counterpart of `getPublicUrl`); `body` is a web stream
   * that a route handler can hand straight to a `Response`. Serve with the type from YOUR record,
   * not `contentType`: a mislabelled upload would become a same-origin script.
   */
  async getFile(key: string) {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    return {
      body: result.Body?.transformToWebStream() as ReadableStream | undefined,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  /**
   * Server-side copy between buckets; the bytes never pass through this process.
   * `CopySource` is `<bucket>/<key>` and must be URL-encoded: an unencoded space or `#` in an
   * upload's file name makes S3 reject the request or copy the wrong object.
   */
  async copyFileFrom(sourceBucket: string, sourceKey: string, destKey: string) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: encodeURI(`${sourceBucket}/${sourceKey}`),
        Key: destKey,
      })
    );

    return { fileKey: destKey };
  }

  getPublicUrl(key: string) {
    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }

  async getPresignedUploadUrl(key: string, expiresIn?: number) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return this.signUrl(this.client, command, {
      expiresIn,
    });
  }
}
