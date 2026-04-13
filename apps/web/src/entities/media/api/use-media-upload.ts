import { uploadMedia } from '@/entities/media/api/upload-media';
import { toast } from '@/shared/hooks/use-toast';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useMediaUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['media'] });
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
