'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { logger } from '@byte-of-me/logger';

import { readWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import type { WorkspaceSettings } from '@/entities/workspace-settings/model/settings-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The owner's full workspace settings, for the dashboard's client query
 * (`workspaceSettingsQueries.current()`). The dashboard layout prefetches that
 * same query on the server, so the first client render already holds the
 * saved values.
 *
 * It reads the same row and cache entry as `getWorkspaceSettings`, so the two
 * cannot disagree. The guard sits outside the `try` (see
 * `getImageCompressionSettings`).
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
