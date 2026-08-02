'use server';

import { logger } from '@byte-of-me/logger';

import { signIn as nextAuthSignIn } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';





export async function logInWithGithub(callbackUrl: string) {
  try {
    logger.info(
      `Attempting to sign in with GitHub, callbackUrl: ${callbackUrl}`
    );

    // `redirectTo` + a positional `authorizationParams`: Auth.js v5's shape.
    // The previous `callbackUrl` key was silently dropped and the destination
    // fell back to the `Referer` header — which happened to be the right page
    // here, so this read as working. See `log-in-to-dashboard.ts` for detail.
    await nextAuthSignIn(
      'github',
      { redirect: true, redirectTo: callbackUrl },
      { prompt: 'login' }
    );
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    if (errorMsg.includes('NEXT_REDIRECT')) throw error;
    logger.error(`GitHub login error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
