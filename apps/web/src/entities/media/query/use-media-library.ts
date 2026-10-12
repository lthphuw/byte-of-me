'use client';

import { useQuery } from '@tanstack/react-query';

import { deleteMedia } from '@/entities/media/api/delete-media';
import { mediaKeys } from '@/entities/media/model/query-keys';
import { mediaQueries } from '@/entities/media/query/media-queries';
import {
  type MediaUploadMessages,
  useMediaUpload,
} from '@/entities/media/query/use-media-upload';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

interface MediaLibraryMessages extends MediaUploadMessages {
  deleteSuccess: string;
  deleteError: string;
}

/** The library grid for `page`, with its upload and delete writes. */
export function useMediaLibrary(page: number, messages: MediaLibraryMessages) {
  const query = useQuery({
    ...mediaQueries.library(page),
    // Keep the previous page on screen while the next loads. Without it the
    // grid is replaced by a skeleton and the dimmed state never shows.
    placeholderData: (previous) => previous,
  });
  const upload = useMediaUpload(messages);
  const remove = useServerMutation({
    mutationFn: (id: string) => deleteMedia(id),
    errorMessage: messages.deleteError,
    successMessage: messages.deleteSuccess,
    invalidate: [mediaKeys.all],
  });

  return { query, upload, remove };
}
