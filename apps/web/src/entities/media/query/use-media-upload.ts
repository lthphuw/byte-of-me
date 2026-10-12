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
}

/**
 * The one client upload write. It reports only failure: the upload dialog that
 * called it says success, since it knows how many files it sent. A refusal
 * leaves that dialog open (`mutateAsync` rejects).
 */
export function useMediaUpload({ uploadError }: MediaUploadMessages) {
  return useServerMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    errorMessage: uploadError,
    invalidate: [mediaKeys.all],
  });
}
