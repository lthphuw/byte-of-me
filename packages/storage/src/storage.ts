import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { StorageConfig, UploadFileParams } from './storage.interface';
import { createS3Client } from './s3.factory';

export class Storage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicEndpoint: string;

  constructor(config: StorageConfig, client?: S3Client) {
    this.client = client ?? createS3Client(config);
    this.bucket = config.bucket;
    this.publicEndpoint = config.publicEndpoint.replace(/\/$/, '');
  }

  async uploadFile(params: UploadFileParams) {
    const { fileKey, body, contentType } = params;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: body,
        ContentType: contentType,
      }),
    );

    return { fileKey };
  }

  async deleteFile(key: string) {
    return this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string) {
    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }

  async getPresignedUploadUrl(key: string, expiresIn?: number) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn,
    });
  }
}
