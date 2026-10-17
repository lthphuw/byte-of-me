import { unwrapApiResponse } from '@byte-of-me/api-core';
import { workspaceSettingsKeys } from '@byte-of-me/contracts/workspace-settings';
import { queryOptions } from '@tanstack/react-query';

import { getAdminWorkspaceSettings } from '@/entities/workspace-settings/api/get-admin-workspace-settings';

export const workspaceSettingsQueries = {
  current: () =>
    queryOptions({
      queryKey: workspaceSettingsKeys.current(),
      queryFn: async () => unwrapApiResponse(await getAdminWorkspaceSettings()),
      // Hydrated by the dashboard layout, and changed only by a write that
      // returns the server's own answer. Nothing refetches it on its own.
      staleTime: Infinity,
    }),
};
