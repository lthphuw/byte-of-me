'use server';

import { logger } from '@byte-of-me/logger';

import { signIn as nextAuthSignIn } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';





export async function logInWithGithub(callbackUrl: string) {
  try {
    logger.info(
      `Attempting to sign in with GitHub, callbackUrl: ${callbackUrl}`
    );

    await nextAuthSignIn('github', {
      redirect: true,
      callbackUrl,
      authorizationParams: {
        prompt: 'login',
      },
    });
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    if (errorMsg.includes('NEXT_REDIRECT')) throw error;
    logger.error(`GitHub login error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
