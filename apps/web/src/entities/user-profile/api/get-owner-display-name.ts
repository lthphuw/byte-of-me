import { cache } from 'react';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';
import { getLocale } from 'next-intl/server';

import 'server-only';

import { env } from '@/shared/config/env';
import { requireAdmin } from '@/shared/lib/auth';
import {
  CACHE_TAGS,
  LAYOUT_CACHE_REVALIDATE_SECONDS,
} from '@/shared/lib/constants';
import {
  getTranslatedContent,
  getTranslationLanguages,
} from '@/shared/lib/i18n-utils';

/** What the greeting falls back to when the profile has no name on it. */
const FALLBACK_DISPLAY_NAME = 'Admin';

/**
 * The database half of {@link getOwnerDisplayName}, behind Next's data cache.
 *
 * Split out as its own function because `unstable_cache` cannot read cookies,
 * headers or the session — the callback runs outside the request that filled
 * the cache, and may not run at all. So `requireAdmin()` and `getLocale()`
 * stay in the caller and their results arrive here as arguments. Both are in
 * the key array as well as the signature: the email is the identity this row
 * belongs to, and a key that omitted it would serve one account's name to
 * another. AGENTS.md §8's rule about closure-captured arguments is the same
 * rule seen from the other side.
 *
 * ONE statement, not two. The obvious spelling of this read —
 * `userProfile.findFirst` with a nested `select: { translations: ... }` —
 * makes Prisma issue the parent row and the translation rows as separate
 * queries, and against Supabase in ap-northeast-1 that is two ~92ms round
 * trips for a tab label. Querying the translation table directly and pushing
 * the ownership check into a relation FILTER keeps it in the SQL: relation
 * filters compile to joins, only relation *selects* are split. Verified
 * against the debug query log — the generated statement is a single SELECT
 * over `user_profile_translations` with two LEFT JOINs onto `user_profiles`
 * and `users`.
 *
 * `findMany` rather than a single row on purpose: `getTranslatedContent` wants
 * the locale row AND the 'en' fallback and picks between them, so narrowing to
 * one row here would have to reimplement that preference in an `orderBy`.
 * There are at most two rows.
 */
const readOwnerDisplayName = (email: string, locale: string) =>
  unstable_cache(
    async () => {
      const translations = await prisma.userProfileTranslation.findMany({
        where: {
          userProfile: { user: { email } },
          language: { in: getTranslationLanguages(locale) },
        },
        select: { language: true, displayName: true },
      });

      const translation = getTranslatedContent(translations, locale);
      return translation?.displayName?.trim() || FALLBACK_DISPLAY_NAME;
    },
    ['owner-display-name', email, locale],
    {
      // `saveProfile` already revalidates this tag, so the TTL is a backstop,
      // not the invalidation — see the constant's own comment.
      tags: [CACHE_TAGS.USER],
      revalidate: LAYOUT_CACHE_REVALIDATE_SECONDS,
    }
  )();

/**
 * The owner's display name, and nothing else.
 *
 * NOT a server action — no `'use server'` — and that is what lets it be
 * wrapped in React's `cache()`. `/space` reads this twice per request: once in
 * `space/layout.tsx`'s `generateMetadata` and once in `SpaceHub`. Both used to
 * call `getUserProfile()`, which joins `user` → `userProfile` → `translations`
 * and returns fourteen fields to have one read; the whole join ran twice, and
 * on `/space/notes/<id>` and `/space/notes/graph` it ran once per navigation
 * for a title every child page then overrides.
 *
 * TWO caches, and they are not redundant. React's `cache()` is the outer layer
 * and dedupes WITHIN one request — that is what collapses the metadata call
 * and the hub call into one. It does nothing across requests, and the
 * `(protected)` group is `force-dynamic`, so before the inner
 * `unstable_cache` this still paid a Tokyo round trip on every single
 * navigation for a name that changes when the author edits their profile and
 * at no other time. The inner layer is what makes a warm navigation pay none.
 *
 * The guard stays here, outside both caches, and that ordering is the point
 * rather than an accident of layout: §5's rule is that a query guards itself,
 * and a cached callback has no session to guard with. `requireAdmin()` runs on
 * every call including a cache hit; only the row read is skipped.
 *
 * Nothing is exported through a client-reachable path, so `server-only` is
 * the guard rather than the action boundary.
 */
export const getOwnerDisplayName = cache(async (): Promise<string> => {
  try {
    const admin = await requireAdmin();
    // `env.EMAIL` for the same reason `getUserProfile` uses it: a provider can
    // return a session with no address on it, and the profile row is keyed by
    // one.
    const email = admin.email || env.EMAIL;
    const locale = await getLocale();

    return await readOwnerDisplayName(email, locale);
  } catch (error) {
    // A name is decoration on a greeting and a tab label. Failing to read one
    // must not take the page down with it — `getSpaceStats` is what decides
    // whether the hub has anything to show. The catch is deliberately outside
    // the cached read too, so that a cache MISS that throws lands here rather
    // than propagating: `unstable_cache` does not store a rejection, so the
    // next request simply tries again.
    logger.warn(`Get owner display name failed: ${String(error)}`);
    return FALLBACK_DISPLAY_NAME;
  }
});
