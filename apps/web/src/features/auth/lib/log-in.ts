'use server';

import { signIn as nextAuthSignIn } from '@/features/auth/lib/auth';
import { ApiResponse } from '@/shared/types/api/api-response.type';
import { logger } from '@byte-of-me/logger';

export async function logIn(
  email: string,
  callbackUrl: string
): Promise<ApiResponse<any>> {
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
