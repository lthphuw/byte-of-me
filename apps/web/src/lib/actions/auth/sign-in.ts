'use server';

import { logger } from '@byte-of-me/logger';

import { ApiActionResponse } from '@/types/api/api-action.type';
import { signIn as nextAuthSignIn } from '@/lib/auth/auth';

export async function signIn(
  email: string,
  callbackUrl: string
): Promise<ApiActionResponse<any>> {
  try {
    logger.info(
      `Attempting to sign in user with email: ${email}, callbackUrl: ${callbackUrl}`
    );
    const res = await nextAuthSignIn('email', {
      email,
      redirect: false,
      callbackUrl: '/en/dashboard',
    });

    return {
      success: true,
      data: res,
    };
  } catch (e: any) {
    logger.error(`Login ${email} got error: ${e.message}`);
    return {
      success: false,
      errorMsg: e.message || 'An unexpected error occurred during sign in.',
    };
  }
}
