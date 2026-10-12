import { queryOptions } from '@tanstack/react-query';

import { getAdminWorkspaceSettings } from '@/entities/workspace-settings/api/get-admin-workspace-settings';
import { workspaceSettingsKeys } from '@/entities/workspace-settings/model/query-keys';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

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
