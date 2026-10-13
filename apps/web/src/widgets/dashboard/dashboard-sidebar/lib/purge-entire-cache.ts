'use server';

import { logger } from '@byte-of-me/logger';
import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Revalidates the entire application by targeting the root layout.
 */
export async function purgeEntireCache(): Promise<ApiResponse<null>> {
  // Server actions are public HTTP endpoints — without this gate anyone can
  // stampede the cache into repeated full purges.
  await requireAdmin();

  try {
    revalidatePath('/', 'layout');

    logger.info(`[Cache] Successfully purged entire application cache.`);
    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to purge cache');
    logger.error(`[Cache] Failed to purge app cache: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
