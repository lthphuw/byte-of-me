'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { uploadMedia } from '@/entities/media/api/upload-media';
import { mediaKeys } from '@/entities/media/model/query-keys';

/**
 * Whole, pre-translated toast sentences (the i18n path) — see
 * `UseMediaLibraryMessages` in `use-media-library.ts` for why this hook takes
 * strings instead of translating internally.
 */
export interface UseMediaUploadMessages {
  uploadSuccess: string;
  uploadError: string;
}

export function useMediaUpload(messages?: UseMediaUploadMessages) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.all });
        toast(messages ? messages.uploadSuccess : 'Upload successful');
      } else {
        toast.error(messages ? messages.uploadError : 'Upload failed', {
          description: res.errorMsg,
        });
      }
    },
  });
}
