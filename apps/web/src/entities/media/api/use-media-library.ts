import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteMedia } from '@/entities/media/api/delete-media';
import { getPaginatedMedia } from '@/entities/media/api/get-paginated-media';
import { uploadMedia } from '@/entities/media/api/upload-media';
import { toast } from '@/shared/hooks/use-toast';

export function useMediaLibrary(page = 1) {
  const queryClient = useQueryClient();

  // Fetching
  const query = useQuery({
    queryKey: ['media', page],
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
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast({ title: 'Upload successful' });
    },
  });

  // Deleting
  const remove = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast({ title: 'Media deleted' });
    },
  });

  return { query, upload, remove };
}
