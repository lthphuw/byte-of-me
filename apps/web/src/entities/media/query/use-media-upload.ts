'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { uploadMedia } from '@/entities/media/api/upload-media';
import { mediaKeys } from '@/entities/media/model/query-keys';

export function useMediaUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (files: File[]) => uploadMedia(files),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.all });
        toast('Upload successful');
      } else {
        toast.error('Upload failed', {
          description: res.errorMsg,
        });
      }
    },
  });
}
