'use server';

import { logger } from '@byte-of-me/logger';

import { signIn as nextAuthSignIn } from '@/shared/lib/auth';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function logIn(
  email: string,
  callbackUrl: string
): Promise<ApiResponse<Any>> {
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
  } catch (e: Any) {
    logger.error(`Login ${email} got error: ${e.message}`);
    return {
      success: false,
      errorMsg: e.message || 'An unexpected error occurred during sign in.',
    };
  }
}
