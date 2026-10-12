'use client';

import { useQueryClient } from '@tanstack/react-query';

import { updateWorkspaceSettings } from '@/entities/workspace-settings/api/update-workspace-settings';
import { workspaceSettingsKeys } from '@/entities/workspace-settings/model/query-keys';
import type { WorkspaceSettings } from '@/entities/workspace-settings/model/settings-schema';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

interface ImageCompressionMessages {
  errorMessage: string;
}

/**
 * Writes the whole `imageCompression` object (the jsonb merge replaces that key
 * outright) and puts the server's answer into the settings query.
 */
export function useUpdateImageCompression({
  errorMessage,
}: ImageCompressionMessages) {
  const queryClient = useQueryClient();

  return useServerMutation<ImageCompressionConfig, WorkspaceSettings>({
    mutationFn: (imageCompression) =>
      updateWorkspaceSettings({ imageCompression }),
    errorMessage,
    onSuccess: (settings) => {
      queryClient.setQueryData(workspaceSettingsKeys.current(), settings);
    },
  });
}
