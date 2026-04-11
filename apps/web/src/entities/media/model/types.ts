export interface Media {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  fileName: string;
  fileKey: string;
  mimeType: string;
  size: number;
  provider: string;
  bucket: string;
  url: string;
}
