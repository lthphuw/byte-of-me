'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import type { ImageCompressionConfig } from '@byte-of-me/contracts';
import { logger } from '@byte-of-me/logger';

import { readWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Client-safe entry to the compression slice (`getWorkspaceSettings` is server-only).
 * `uploadSingleMedia` needs it BEFORE the `uploadMedia` handoff, to compress an oversized file
 * first. The guard sits outside the `try`, so a non-owner's call rejects (fail-closed, AGENTS §8).
 */
export async function getImageCompressionSettings(): Promise<
  ApiResponse<ImageCompressionConfig>
> {
  const admin = await requireAdmin();

  try {
    const settings = await readWorkspaceSettings(admin.id);
    return { success: true, data: settings.imageCompression };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'Failed to read image compression settings'
    );
    logger.error(
      `[WorkspaceSettings] getImageCompressionSettings: ${errorMsg}`
    );
    return { success: false, errorMsg };
  }
}
