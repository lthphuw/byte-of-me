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

/**
 * The slice of a stored file a public payload carries: where it is and how big
 * it draws. The storage columns (`bucket`, `provider`, `fileKey`, `userId`)
 * stay on the server.
 */
export interface PublicMedia {
  id: string;
  url: string;
  mimeType: string;
  width: Maybe<number>;
  height: Maybe<number>;
}
