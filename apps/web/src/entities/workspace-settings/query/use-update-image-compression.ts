'use client';

import type { ImageCompressionConfig } from '@byte-of-me/contracts';
import {
  type WorkspaceSettings,
  workspaceSettingsKeys,
} from '@byte-of-me/contracts/workspace-settings';
import { useQueryClient } from '@tanstack/react-query';

import { updateWorkspaceSettings } from '@/entities/workspace-settings/api/update-workspace-settings';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

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
