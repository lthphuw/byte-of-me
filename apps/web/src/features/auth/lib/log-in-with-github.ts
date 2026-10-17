'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import {
  sanitizeCallbackUrl,
  signIn as nextAuthSignIn,
} from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function logInWithGithub(
  callbackUrl: string
): Promise<ApiResponse<null>> {
  try {
    // The action is callable directly: never trust the value as a redirect or log.
    const destination = sanitizeCallbackUrl(callbackUrl, await getLocale());

    logger.info(
      `Attempting to sign in with GitHub, callbackUrl: ${destination}`
    );

    // `redirectTo` + a positional `authorizationParams`: Auth.js v5's shape; a `callbackUrl`
    // key is silently dropped (see `log-in-to-dashboard.ts`).
    await nextAuthSignIn(
      'github',
      { redirect: true, redirectTo: destination },
      { prompt: 'login' }
    );
    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    // The redirect signal is the success path: rethrow it, never envelope it.
    if (errorMsg.includes('NEXT_REDIRECT')) throw error;
    logger.error(`GitHub login error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
