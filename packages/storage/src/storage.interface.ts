export type StorageConfig = {
  region: string;
  bucket: string;
  endpoint?: string;
  publicEndpoint: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

export type UploadFileParams = {
  fileKey: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType?: string;
};
