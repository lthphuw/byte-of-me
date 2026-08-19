'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteMedia } from '@/entities/media/api/delete-media';
import { getPaginatedMedia } from '@/entities/media/api/get-paginated-media';
import { uploadMedia } from '@/entities/media/api/upload-media';
import { mediaKeys } from '@/entities/media/model/query-keys';

/**
 * Whole, pre-translated toast sentences (the i18n path). When supplied, each
 * string is used verbatim instead of the English literal below — mirrors the
 * `messages` option on `useCrudManager`. This hook lives in `entities/`,
 * which must not decide which `dashboard.*` namespace owns the copy or call
 * `useTranslations` itself, so the caller (a widget/feature that already
 * knows its own namespace) is responsible for passing translated strings.
 */
export interface UseMediaLibraryMessages {
  uploadSuccess: string;
  uploadError: string;
  deleteSuccess: string;
  deleteError: string;
}

export function useMediaLibrary(
  page = 1,
  messages?: UseMediaLibraryMessages
) {
  const queryClient = useQueryClient();

  // Fetching
  const query = useQuery({
    queryKey: mediaKeys.library(page),
    queryFn: () =>
      getPaginatedMedia({
        page,
        limit: 12,
      }),
    // Keep the previous page on screen while the next one loads, as every
    // other manager does: without it the grid and its pagination control are
    // replaced by a spinner, and `isPlaceholderData` (which the library dims
    // the grid with) is never true.
    placeholderData: (prev) => prev,
  });

  // Uploading
  const upload = useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast(messages ? messages.uploadSuccess : 'Upload successful');
    },
    onError: () =>
      toast.error(messages ? messages.uploadError : 'Upload failed'),
  });

  // Deleting
  const remove = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      toast(messages ? messages.deleteSuccess : 'Media deleted');
    },
    onError: () =>
      toast.error(messages ? messages.deleteError : 'Could not delete media'),
  });

  return { query, upload, remove };
}
