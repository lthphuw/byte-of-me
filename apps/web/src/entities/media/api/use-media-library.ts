'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteMedia } from '@/entities/media/api/delete-media';
import { getPaginatedMedia } from '@/entities/media/api/get-paginated-media';
import { uploadMedia } from '@/entities/media/api/upload-media';
import { CACHE_TAGS } from '@/shared/lib/constants';

export function useMediaLibrary(page = 1) {
  const queryClient = useQueryClient();

  // Fetching
  const query = useQuery({
    queryKey: [CACHE_TAGS.MEDIA, page],
    queryFn: () =>
      getPaginatedMedia({
        page,
        limit: 12,
      }),
  });

  // Uploading
  const upload = useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.MEDIA] });
      toast('Upload successful');
    },
    onError: () => toast.error('Upload failed'),
  });

  // Deleting
  const remove = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.MEDIA] });
      toast('Media deleted');
    },
    onError: () => toast.error('Could not delete media'),
  });

  return { query, upload, remove };
}
