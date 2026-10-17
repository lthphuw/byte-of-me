'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { logger } from '@byte-of-me/logger';

import { readWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
import { requireAdmin } from '@/shared/lib/auth';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The client-safe entry point onto the image-compression slice of the
 * workspace settings.
 *
 * `getWorkspaceSettings` itself cannot be called from client code — it has no
 * `'use server'` (so React's `cache()` works) and value-imports `prisma`. This
 * action is what `uploadSingleMedia` calls: that function runs in the browser
 * up until it hands off to `uploadMedia`, and it needs this config BEFORE that
 * handoff, to compress a file that would otherwise be rejected by the pre-flight
 * size check for being oversized before compression ever ran.
 *
 * The guard sits outside the `try`, so a non-owner's call rejects instead of
 * returning an envelope. That is the fail-closed rule (AGENTS §8).
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
