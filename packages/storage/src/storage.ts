import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { StorageConfig, UploadFileParams } from './storage.interface';

export class Storage {
  private readonly client: S3Client;
  private readonly bucket: string;

  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = {...config}
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials,
      forcePathStyle: true,
    });
    this.bucket = config.bucket;
  }

  async uploadFile({fileKey, body, contentType}: UploadFileParams) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);

    return { fileKey }
  }

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return this.client.send(command);
  }

  async getPublicUrl(key: string) {
    return  `${this.config.publicEndpoint}/${this.bucket}/${key}`;
  }

  async getPresignedUploadUrl(key: string, expiresIn = null) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresIn ?? undefined });
  }
}
