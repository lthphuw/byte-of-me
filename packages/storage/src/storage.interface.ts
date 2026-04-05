
export interface StorageConfig {
  region: string;
  endpoint: string;
  publicEndpoint: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  bucket: string;
}

export interface UploadFileParams {
  fileKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
}


export interface UploadFileResponse {
  fileKey: string;
  sendResult: any;
}
