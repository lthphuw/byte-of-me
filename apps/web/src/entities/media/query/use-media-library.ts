'use client';

import { mediaKeys } from '@byte-of-me/contracts/media';
import { useServerMutation } from '@byte-of-me/query';
import { useQuery } from '@tanstack/react-query';

import { deleteMedia } from '@/entities/media/api/delete-media';
import { mediaQueries } from '@/entities/media/query/media-queries';
import {
  type MediaUploadMessages,
  useMediaUpload,
} from '@/entities/media/query/use-media-upload';
import { useVideoUpload } from '@/entities/media/query/use-video-upload';

interface MediaLibraryMessages extends MediaUploadMessages {
  deleteSuccess: string;
  deleteError: string;
}

/** The library grid for `page`, with its image and clip uploads and its delete. */
export function useMediaLibrary(page: number, messages: MediaLibraryMessages) {
  const query = useQuery({
    ...mediaQueries.library(page),
    // Keep the previous page on screen while the next loads. Without it the
    // grid is replaced by a skeleton and the dimmed state never shows.
    placeholderData: (previous) => previous,
  });
  const upload = useMediaUpload(messages);
  const uploadClip = useVideoUpload(messages);
  const remove = useServerMutation({
    mutationFn: (id: string) => deleteMedia(id),
    errorMessage: messages.deleteError,
    successMessage: messages.deleteSuccess,
    invalidate: [mediaKeys.all],
  });

  return { query, upload, uploadClip, remove };
}
