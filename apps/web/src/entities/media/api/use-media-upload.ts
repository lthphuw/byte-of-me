import { useMutation, useQueryClient } from '@tanstack/react-query';

import { uploadMedia } from '@/entities/media/api/upload-media';
import { toast } from '@/shared/hooks/use-toast';
import { CACHE_TAGS } from '@/shared/lib/constants';

export function useMediaUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: [CACHE_TAGS.MEDIA] });
        toast({ title: 'Upload successful' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: res.errorMsg,
        });
      }
    },
  });
}
