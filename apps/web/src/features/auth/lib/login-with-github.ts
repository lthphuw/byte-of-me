'use server';

import { logger } from '@byte-of-me/logger';

import { signIn as nextAuthSignIn } from '@/shared/lib/auth';





export async function logInWithGitHub(callbackUrl: string) {
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
  } catch (e: Any) {
    if (e.message?.includes('NEXT_REDIRECT')) throw e;
    logger.error(`GitHub login error: ${e.message}`);
    return { success: false, errorMsg: e.message };
  }
}
