'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import {
  normalizeEmail,
  sanitizeCallbackUrl,
  signIn as nextAuthSignIn,
} from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

const emailSchema = z.string().trim().email('A valid email is required');

/** Where an invite sign-in lands when the link carried no destination. */
const SHARED_DESTINATION = '/shared';

/** This flow's own sign-in page. Landing back on it is an immediate loop. */
const INVITE_PATH = '/invite';

/**
 * Send a share recipient their magic link.
 *
 * Separate from `logInToDashboard` because that one refuses every address
 * that is not the site owner's — it *is* the owner's gate. Widening it to
 * admit recipients would put two audiences behind one check that would then
 * have to be right about both at once.
 *
 * **The response does not depend on whether a grant exists.** A form that
 * answered "no invitation for that address" would be an oracle for
 * enumerating who the owner has shared with, from a page anyone can reach.
 * The mail is only sent when there is something to open; the answer is the
 * same either way.
 */
export async function logInToSharedSpace(
  email: string,
  callbackUrl: string | null | undefined
): Promise<ApiResponse<string>> {
  const parsed = parseInput(emailSchema, email);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }

  const address = normalizeEmail(parsed.data);

  try {
    const grant = await prisma.noteShare.findFirst({
      where: { email: address },
      select: { id: true },
    });

    if (grant) {
      const locale = await getLocale();

      // `redirectTo`, NOT `callbackUrl` — see the comment in
      // `log-in-to-dashboard.ts` for why Auth.js v5's rename fails silently
      // and in the worst possible way.
      await nextAuthSignIn('email', {
        email: address,
        redirect: false,
        redirectTo: sanitizeCallbackUrl(callbackUrl, locale, {
          defaultDestination: SHARED_DESTINATION,
          signInPath: INVITE_PATH,
        }),
      });
    } else {
      // Logged so the owner can explain "I never got the email", and
      // deliberately WITHOUT the address: recording it would move the
      // enumeration oracle from the response into the log rather than
      // removing it.
      logger.info('Invite sign-in requested for an address with no grant');
    }

    return { success: true, data: SHARED_DESTINATION };
  } catch (error) {
    const errorMsg = getErrorMessage(
      error,
      'An unexpected error occurred during sign in.'
    );
    logger.error(`Invite sign-in error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
