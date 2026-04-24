'use server';

import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import { env } from '@/shared/config/env';
import { signIn as nextAuthSignIn } from '@/shared/lib/auth';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function logInToDashboard(
  email: string,
  callbackUrl: string
): Promise<ApiResponse<Any>> {
  try {
    logger.info(
      `Attempting to sign in user with email: ${email}, callbackUrl: ${callbackUrl}`
    );
    if (email !== env.EMAIL) {
      throw new Error('Invalid email, try again later');
    }

    const locale = await getLocale();
    const res = await nextAuthSignIn('email', {
      email,
      redirect: false,
      callbackUrl: `/${locale}/dashboard`,
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
