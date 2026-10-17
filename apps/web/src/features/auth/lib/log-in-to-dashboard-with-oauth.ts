'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import {
  ADMIN_OAUTH_PROVIDER_IDS,
  sanitizeCallbackUrl,
  signIn as nextAuthSignIn,
} from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The providers the sign-in page may start an admin OAuth flow with. The mapping is server-side
 * because an action is addressable (AGENTS §5): a client-supplied id could start a flow with the
 * ungated public `github`/`google` providers, bypassing the owner-only `signIn` callback check.
 */
const ADMIN_OAUTH_PROVIDERS = {
  github: ADMIN_OAUTH_PROVIDER_IDS.GITHUB,
  google: ADMIN_OAUTH_PROVIDER_IDS.GOOGLE,
} as const;

type AdminOAuthProvider = keyof typeof ADMIN_OAUTH_PROVIDERS;

/**
 * Starts an admin OAuth sign-in and redirects to the provider. Whether the identity is allowed in
 * is decided by the `signIn` callback in `@/shared/lib/auth/auth.ts` and again by
 * `getAuthenticatedAdmin()`.
 */
export async function logInToDashboardWithOAuth(
  provider: AdminOAuthProvider,
  callbackUrl: string
): Promise<ApiResponse<null>> {
  const providerId = ADMIN_OAUTH_PROVIDERS[provider];

  if (!providerId) {
    logger.warn(`Admin OAuth sign-in requested with unknown provider`);
    return { success: false, errorMsg: 'Unsupported sign-in provider.' };
  }

  try {
    const locale = await getLocale();
    const destination = sanitizeCallbackUrl(callbackUrl, locale);

    logger.info(
      `Attempting admin sign-in with ${providerId}, callbackUrl: ${destination}`
    );

    await nextAuthSignIn(
      providerId,
      {
        redirect: true,
        // `redirectTo`, not `callbackUrl` — see the note in
        // `log-in-to-dashboard.ts` for what Auth.js v5 does with the old name.
        redirectTo: destination,
      },
      // Third positional argument: inside `options` it is swept into `...rest` and POSTed as
      // the literal `[object Object]`, so the prompt never reaches the provider.
      { prompt: 'login' }
    );
    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    // `redirect: true` reports success by throwing the framework's redirect
    // signal — swallowing it here would strand the user on the sign-in page.
    if (errorMsg.includes('NEXT_REDIRECT')) throw error;
    logger.error(`Admin ${providerId} login error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
