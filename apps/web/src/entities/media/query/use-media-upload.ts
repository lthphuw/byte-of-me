'use client';

import { uploadMedia } from '@/entities/media/api/upload-media';
import { mediaKeys } from '@/entities/media/model/query-keys';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

/**
 * Whole, pre-translated toast sentences. An entity cannot pick its `dashboard.*`
 * namespace, so the caller passes the text.
 */
export interface MediaUploadMessages {
  uploadError: string;
  uploadSuccess: string;
}

/**
 * The one client upload write for images. It reports success and failure itself:
 * `mutateAsync` rejects on a refusal, which leaves the caller's dialog open.
 */
export function useMediaUpload({
  uploadError,
  uploadSuccess,
}: MediaUploadMessages) {
  return useServerMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    errorMessage: uploadError,
    successMessage: uploadSuccess,
    invalidate: [mediaKeys.all],
  });
}
