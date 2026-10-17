'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import {
  isSiteOwnerEmail,
  sanitizeCallbackUrl,
  signIn as nextAuthSignIn,
} from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/** Every refusal reads the same: a stranger learns nothing about who the owner is. */
const SIGN_IN_FAILURE_MESSAGE = 'Invalid email, try again later';

export async function logInToDashboard(
  email: string,
  // Widened from `string`: the raw `?from=` is whatever was on the URL, so
  // absent is a normal case rather than something the caller must paper over.
  // `sanitizeCallbackUrl` is the one place that decides what absent means.
  callbackUrl: string | null | undefined
): Promise<ApiResponse<string>> {
  try {
    // Neither is logged: both come from an anonymous caller (PII, log injection).
    if (!isSiteOwnerEmail(email)) {
      return { success: false, errorMsg: SIGN_IN_FAILURE_MESSAGE };
    }

    const locale = await getLocale();
    // With `redirect: false`, next-auth resolves with the URL to redirect to.
    const res: string = await nextAuthSignIn('email', {
      email,
      redirect: false,
      // `redirectTo`, NOT `callbackUrl`: Auth.js v5 `signIn` sweeps `callbackUrl` into `...rest`
      // and overwrites it with the Referer (the sign-in page itself), so a deep `?from=` was always
      // lost.
      redirectTo: sanitizeCallbackUrl(callbackUrl, locale),
    });

    return {
      success: true,
      data: res,
    };
  } catch (error) {
    // The detail (SMTP host, Auth.js internals) stays in the log.
    logger.error(`Dashboard email sign-in failed: ${getErrorMessage(error)}`);
    return { success: false, errorMsg: SIGN_IN_FAILURE_MESSAGE };
  }
}
