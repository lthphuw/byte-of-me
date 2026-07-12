'use server';

import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import { env } from '@/shared/config/env';
import { signIn as nextAuthSignIn } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function logInToDashboard(
  email: string,
  callbackUrl: string
): Promise<ApiResponse<string>> {
  try {
    logger.info(
      `Attempting to sign in user with email: ${email}, callbackUrl: ${callbackUrl}`
    );
    if (email !== env.EMAIL) {
      throw new Error('Invalid email, try again later');
    }

    const locale = await getLocale();
    // With `redirect: false`, next-auth resolves with the URL to redirect to.
    const res: string = await nextAuthSignIn('email', {
      email,
      redirect: false,
      callbackUrl: `/${locale}/dashboard`,
    });

    return {
      success: true,
      data: res,
    };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'An unexpected error occurred during sign in.'
    );
    logger.error(`Login ${email} got error: ${errorMsg}`);
    return {
      success: false,
      errorMsg,
    };
  }
}
