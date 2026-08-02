'use server';

import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import {
  ADMIN_OAUTH_PROVIDER_IDS,
  sanitizeCallbackUrl,
  signIn as nextAuthSignIn,
} from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * The providers the sign-in page may start an admin OAuth flow with.
 *
 * The mapping is here, server-side, rather than letting the caller name a
 * provider id directly. A server action is an addressable endpoint (AGENTS §5),
 * so a client-supplied id would let anyone start a flow with any registered
 * provider — including the ungated public `github` / `google` ones, which would
 * route straight around the owner-only check in the `signIn` callback. Callers
 * choose from this key set; the server decides what that means.
 */
const ADMIN_OAUTH_PROVIDERS = {
  github: ADMIN_OAUTH_PROVIDER_IDS.GITHUB,
  google: ADMIN_OAUTH_PROVIDER_IDS.GOOGLE,
} as const;

export type AdminOAuthProvider = keyof typeof ADMIN_OAUTH_PROVIDERS;

/**
 * Starts an admin OAuth sign-in and redirects to the provider.
 *
 * Whether the resulting identity is actually allowed in is decided by the
 * `signIn` callback in `@/shared/lib/auth/auth.ts`, and again by
 * `getAuthenticatedAdmin()` when the destination renders.
 */
export async function logInToDashboardWithOAuth(
  provider: AdminOAuthProvider,
  callbackUrl: string
) {
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
      // Third positional argument, not a key inside the options object.
      // `signIn(provider, options, authorizationParams, config)` spreads this
      // into the provider's authorize URL; passing it inside `options` instead
      // sweeps it into `...rest` and POSTs it as the literal string
      // `[object Object]`, so the prompt never reaches the provider.
      { prompt: 'login' }
    );
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    // `redirect: true` reports success by throwing the framework's redirect
    // signal — swallowing it here would strand the user on the sign-in page.
    if (errorMsg.includes('NEXT_REDIRECT')) throw error;
    logger.error(`Admin ${providerId} login error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
