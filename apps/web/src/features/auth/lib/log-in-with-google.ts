'use server';

import { logger } from '@byte-of-me/logger';

import { signIn as nextAuthSignIn } from '@/shared/lib/auth';

export async function logInWithGoogle(callbackUrl: string) {
  try {
    logger.info(
      `Attempting to sign in with Google, callbackUrl: ${callbackUrl}`
    );

    await nextAuthSignIn('google', {
      redirect: true,
      callbackUrl,
      authorizationParams: {
        prompt: 'login',
      },
    });
  } catch (e: any) {
    if (e.message?.includes('NEXT_REDIRECT')) throw e;
    logger.error(`Google login error: ${e.message}`);
    return { success: false, errorMsg: e.message };
  }
}
