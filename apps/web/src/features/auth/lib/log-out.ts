'use server';

import { logger } from '@byte-of-me/logger';
import { revalidatePath } from 'next/cache';

import { signOut as nextAuthSignOut } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

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
