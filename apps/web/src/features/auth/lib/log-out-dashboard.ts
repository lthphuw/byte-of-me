'use server';

import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import { signOut as nextAuthSignOut } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

export async function logOutDashboard(): Promise<ApiResponse<null>> {
  try {
    // Prefixed with the active locale: an unprefixed path is resolved by the
    // next-intl proxy to `defaultLocale`, so a `vi` admin signing out would be
    // dropped onto the English sign-in page.
    const locale = await getLocale();

    await nextAuthSignOut({ redirectTo: `/${locale}/auth/login` });
    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    // The redirect signal is the success path: rethrow it, never envelope it.
    if (errorMsg.includes('NEXT_REDIRECT')) throw error;
    logger.error(`Dashboard log out failed: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
