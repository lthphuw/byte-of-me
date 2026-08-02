'use server';

import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import {
  isSiteOwnerEmail,
  sanitizeCallbackUrl,
  signIn as nextAuthSignIn,
} from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';





export async function logInToDashboard(
  email: string,
  // Widened from `string`: the raw `?from=` is whatever was on the URL, so
  // absent is a normal case rather than something the caller must paper over.
  // `sanitizeCallbackUrl` is the one place that decides what absent means.
  callbackUrl: string | null | undefined
): Promise<ApiResponse<string>> {
  try {
    logger.info(
      `Attempting to sign in user with email: ${email}, callbackUrl: ${callbackUrl}`
    );
    if (!isSiteOwnerEmail(email)) {
      throw new Error('Invalid email, try again later');
    }

    const locale = await getLocale();
    // With `redirect: false`, next-auth resolves with the URL to redirect to.
    const res: string = await nextAuthSignIn('email', {
      email,
      redirect: false,
      // `redirectTo`, NOT `callbackUrl`. Auth.js v5 renamed the option, and the
      // rename fails silently in the worst possible way: `signIn` destructures
      // `redirectTo` and sweeps every other key into `...rest`, then builds the
      // request body as `{ ...rest, callbackUrl }` where that second
      // `callbackUrl` is `redirectTo ?? headers.get('Referer') ?? '/'`. A
      // `callbackUrl` passed here therefore lands in `rest` and is overwritten
      // by the Referer — which on this form is the sign-in page itself, so the
      // magic link came back to `/auth/login`, where `(auth)/layout.tsx` bounced
      // the now-authenticated owner to `/dashboard`. That, not the hardcoded
      // string this used to pass, is why `/notes` never worked.
      redirectTo: sanitizeCallbackUrl(callbackUrl, locale),
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
