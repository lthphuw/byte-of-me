import * as z from 'zod';

import {
  ACCEPTED_VIDEO_MIME_TYPES,
  MAX_VIDEO_SIZE_BYTES,
  MEDIA_SCOPES,
} from './upload-constraints';

/** `scope` becomes a storage-key path segment, and the action takes any string. */
export const mediaScopeSchema = z.enum(MEDIA_SCOPES);

/** What `prepareVideoUpload` needs to issue a signed URL; the caller's claims, re-checked. */
export const videoUploadRequestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(ACCEPTED_VIDEO_MIME_TYPES),
  size: z.number().int().positive().max(MAX_VIDEO_SIZE_BYTES),
  scope: mediaScopeSchema,
});

export const videoUploadCompletionSchema = z.object({
  fileKey: z.string().min(1).max(300),
  fileName: z.string().min(1),
});
