'use server';

import { logger } from '@byte-of-me/logger';
import { revalidatePath } from 'next/cache';

import { getErrorMessage } from '@/shared/lib/utils';





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
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to purge cache');
    logger.error(`[Cache] Failed to purge app cache: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
