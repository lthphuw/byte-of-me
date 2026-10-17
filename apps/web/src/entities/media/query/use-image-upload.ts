'use client';

import { useCallback } from 'react';
import { mediaKeys, type MediaScope } from '@byte-of-me/contracts/media';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  uploadSingleMedia,
  uploadSingleMediaRecord,
} from '@/entities/media/api/upload-single-media';

/**
 * One image into the library, resolving with the stored row. The uploader
 * throws on refusal (the `ImageUploadFn` contract), so this is a plain
 * `useMutation`: `useServerMutation` unwraps envelopes, and this has none.
 */
export function useMediaRecordUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, scope }: { file: File; scope: MediaScope }) =>
      uploadSingleMediaRecord(file, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

/**
 * The `uploadImage` that editors and forms pass down. Resolves with the stored
 * URL and refuses a clip, as the rich-text editor expects.
 */
export function useScopedImageUploader(scope: MediaScope) {
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: (file: File) => uploadSingleMedia(file, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });

  return useCallback((file: File) => mutateAsync(file), [mutateAsync]);
}
