import { cache } from 'react';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { unstable_cache } from 'next/cache';

import 'server-only';

import {
  parseWorkspaceSettings,
  WORKSPACE_SETTINGS_DEFAULTS,
  type WorkspaceSettings,
} from '@/entities/workspace-settings/model/settings-schema';
import { requireAdmin } from '@/shared/lib/auth';
import {
  CACHE_TAGS,
  LAYOUT_CACHE_REVALIDATE_SECONDS,
} from '@/shared/lib/constants';

/**
 * The database half of {@link getWorkspaceSettings}, behind Next's data cache.
 *
 * `ownerId` is an argument rather than something the callback reads for
 * itself, because an `unstable_cache` callback has no session: it runs outside
 * the request that populated the entry, and on a hit it does not run at all.
 * It is in the key array for the same reason it is in the signature — this row
 * is one person's preferences, and a key that left the owner out would seed
 * one account's workspace from another's.
 *
 * Returns the PARSED object, not the raw `preferences` column. `unstable_cache`
 * serializes what it stores, so what comes back on a hit has been through
 * `JSON.parse` — parsing before the cache means the stored value is already
 * the flat, defaulted, schema-checked shape rather than whatever a row written
 * by an older build happens to hold. There are no `Date`s in it, so the
 * round-trip is lossless (contrast `getAdjacentPublicBlogs`, which has to
 * accept `Date | string` for exactly that reason).
 */
const readWorkspaceSettings = (ownerId: string) =>
  unstable_cache(
    async () => {
      const row = await prisma.workspaceSettings.findUnique({
        where: { ownerId },
        select: { preferences: true },
      });

      // `parseWorkspaceSettings` handles the no-row case too — `undefined` is
      // not an object, so it returns the defaults. The row is absent for every
      // author until the first time they change something, which is the
      // overwhelmingly common case and not worth a branch.
      return parseWorkspaceSettings(row?.preferences);
    },
    ['workspace-settings', ownerId],
    {
      // `updateWorkspaceSettings` revalidates this tag, which is what makes a
      // change from the settings popover visible on the very next render. The
      // TTL is only the backstop — see the constant's own comment.
      tags: [CACHE_TAGS.WORKSPACE_SETTINGS],
      revalidate: LAYOUT_CACHE_REVALIDATE_SECONDS,
    }
  )();

/**
 * The author's workspace settings, read on the server.
 *
 * NOT a server action — no `'use server'` — for the same reason
 * `getOwnerDisplayName` is not one: that is what allows React's `cache()`.
 *
 * Reading on the SERVER rather than fetching after hydration is the whole
 * reason this table exists rather than another `localStorage` key. Density,
 * type scale and line length are LAYOUT: read them in an effect and the
 * workspace paints once at the default and then jumps, which is exactly the
 * flash `use-explorer-prefs.ts` documents itself as accepting. Seeded from the
 * server, the first frame is already correct.
 *
 * Two caches, doing two different jobs. React's `cache()` on the outside gives
 * within-request dedupe: `space/layout.tsx` seeds the provider, `dashboard/
 * media/page.tsx` reads the compression config, `getSleepSummary` reads the
 * sleep target, and any of those can co-occur in one render. Next's
 * `unstable_cache` on the inside gives the across-request half, which is the
 * one that matters here — the `(protected)` group is `force-dynamic`, so every
 * navigation used to pay a Supabase round trip to re-read a JSON blob that
 * only changes when the author moves a switch. It is tagged rather than left
 * on a timer precisely because that switch has to appear to save: a stale read
 * here is indistinguishable, from the author's chair, from the write having
 * failed.
 *
 * `requireAdmin()` stays outside both caches. §5's rule is that a query guards
 * itself, and a cached callback has no session to guard with — so the guard
 * runs on every call, hit or miss, and only the row read is skipped.
 *
 * Deliberately not going through TanStack Query's prefetch/hydrate path
 * either. That machinery earns its keep for lists that refetch and mutate;
 * this is one flat object read once per page load, and the failure mode of
 * getting the hydration key wrong is a workspace stuck on skeletons with
 * nothing logged.
 *
 * Never throws. A settings read that fails must not take down a page that has
 * already begun rendering, and every field has a defined default — so the
 * fallback is a fully usable workspace rather than an error. The `try` spans
 * the cached read as well, so a cache MISS that throws is caught here;
 * `unstable_cache` stores nothing for a rejected callback, so the next request
 * retries rather than inheriting the failure.
 */
export const getWorkspaceSettings = cache(
  async (): Promise<WorkspaceSettings> => {
    try {
      const admin = await requireAdmin();

      return await readWorkspaceSettings(admin.id);
    } catch (error) {
      logger.warn(`Get workspace settings failed: ${String(error)}`);
      return { ...WORKSPACE_SETTINGS_DEFAULTS };
    }
  }
);
