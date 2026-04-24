import { S3Client } from '@aws-sdk/client-s3';

import type { StorageConfig } from './storage.interface';

export const createS3Client = (config: StorageConfig) => {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials,
    forcePathStyle: true,
  });
};
