'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { logger } from '@byte-of-me/logger';

/**
 * Revalidates the entire application by targeting the root layout.
 */
export async function purgeEntireCache(): Promise<{
  success: boolean;
  errorMsg?: string;
}> {
  try {
    revalidatePath('/', 'layout');

    logger.info(`[Cache] Successfully purged entire application cache.`);
    return { success: true };
  } catch (error: any) {
    logger.error(`[Cache] Failed to purge app cache: ${error.message}`);
    return {
      success: false,
      errorMsg: error.message || 'Failed to purge cache',
    };
  }
}
