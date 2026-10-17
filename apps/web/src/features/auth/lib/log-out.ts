'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { logger } from '@byte-of-me/logger';
import { revalidatePath } from 'next/cache';

import { signOut as nextAuthSignOut } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function logOut(): Promise<ApiResponse<null>> {
  try {
    await nextAuthSignOut({ redirect: false });

    revalidatePath('/');
    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    logger.error(`Log out failed: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
