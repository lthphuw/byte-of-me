import { cache } from 'react';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale } from 'next-intl/server';

import 'server-only';

import { env } from '@/shared/config/env';
import { requireAdmin } from '@/shared/lib/auth';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';

/** What the greeting falls back to when the profile has no name on it. */
const FALLBACK_DISPLAY_NAME = 'Admin';

/**
 * The owner's display name, and nothing else.
 *
 * NOT a server action — no `'use server'` — and that is what lets it be
 * wrapped in React's `cache()`, which is the entire point. `/space` reads
 * this twice per request: once in `space/layout.tsx`'s `generateMetadata` and
 * once in `SpaceHub`. Both used to call `getUserProfile()`, which joins
 * `user` → `userProfile` → `translations` and returns fourteen fields to have
 * one read; the whole join ran twice, and on `/space/notes/<id>` and
 * `/space/graph` it ran once per navigation for a title every child page then
 * overrides. `cache()` collapses the pair within a request; the narrow
 * `select` here is what makes each occurrence cheap.
 *
 * Nothing is exported through a client-reachable path, so `server-only` is
 * the guard rather than the action boundary. The admin check is still made
 * here, on its own — this file is a query, and §5's rule is that a query
 * guards itself rather than trusting the layout that happened to render it.
 */
export const getOwnerDisplayName = cache(async (): Promise<string> => {
  try {
    const admin = await requireAdmin();
    // `env.EMAIL` for the same reason `getUserProfile` uses it: a provider can
    // return a session with no address on it, and the profile row is keyed by
    // one.
    const email = admin.email || env.EMAIL;
    const locale = await getLocale();

    const profile = await prisma.userProfile.findFirst({
      where: { user: { email } },
      select: {
        translations: {
          where: { language: { in: getTranslationLanguages(locale) } },
          select: { language: true, displayName: true },
        },
      },
    });

    const translation = getTranslatedContent(profile?.translations ?? [], locale);
    return translation?.displayName?.trim() || FALLBACK_DISPLAY_NAME;
  } catch (error) {
    // A name is decoration on a greeting and a tab label. Failing to read one
    // must not take the page down with it — `getSpaceStats` is what decides
    // whether the hub has anything to show.
    logger.warn(`Get owner display name failed: ${String(error)}`);
    return FALLBACK_DISPLAY_NAME;
  }
});
