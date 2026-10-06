'use server';

import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import {
  sanitizeCallbackUrl,
  signIn as nextAuthSignIn,
} from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

export async function logInWithGoogle(callbackUrl: string) {
  try {
    // The action is callable directly: never trust the value as a redirect or log.
    const destination = sanitizeCallbackUrl(callbackUrl, await getLocale());

    logger.info(
      `Attempting to sign in with Google, callbackUrl: ${destination}`
    );

    // `redirectTo` + a positional `authorizationParams`: Auth.js v5's shape.
    // The previous `callbackUrl` key was silently dropped and the destination
    // fell back to the `Referer` header — which happened to be the right page
    // here, so this read as working. See `log-in-to-dashboard.ts` for detail.
    await nextAuthSignIn(
      'google',
      { redirect: true, redirectTo: destination },
      { prompt: 'login' }
    );
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    if (errorMsg.includes('NEXT_REDIRECT')) throw error;
    logger.error(`Google login error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
