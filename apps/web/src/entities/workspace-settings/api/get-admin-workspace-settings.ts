'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import type { WorkspaceSettings } from '@byte-of-me/contracts/workspace-settings';
import { logger } from '@byte-of-me/logger';

import { readWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The owner's full settings for the client query (`workspaceSettingsQueries.current()`), prefetched
 * by the layout; same cache entry as `getWorkspaceSettings`, so they cannot disagree. The guard
 * sits outside the `try` (see `getImageCompressionSettings`).
 */
export async function getAdminWorkspaceSettings(): Promise<
  ApiResponse<WorkspaceSettings>
> {
  const admin = await requireAdmin();

  try {
    return { success: true, data: await readWorkspaceSettings(admin.id) };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to read workspace settings'
    );
    logger.error(`[WorkspaceSettings] getAdminWorkspaceSettings: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
