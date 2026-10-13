'use client';

import { uploadVideoDirect } from '@/entities/media/api/upload-video-direct';
import { mediaKeys } from '@/entities/media/model/query-keys';
import type { MediaScope } from '@/entities/media/model/upload-constraints';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';
import type { Media } from '@/shared/types/models';

interface VideoUploadMessages {
  uploadError: string;
  uploadSuccess?: string;
}

interface VideoUploadVariables {
  file: File;
  scope: MediaScope;
}

/**
 * A clip from the browser to storage and into the library, through a signed URL
 * (`uploadVideoDirect`). Resolves with the stored row.
 */
export function useVideoUpload({
  uploadError,
  uploadSuccess,
}: VideoUploadMessages) {
  return useServerMutation<VideoUploadVariables, Media>({
    mutationFn: ({ file, scope }) => uploadVideoDirect(file, scope),
    errorMessage: uploadError,
    successMessage: uploadSuccess,
    invalidate: [mediaKeys.all],
  });
}
