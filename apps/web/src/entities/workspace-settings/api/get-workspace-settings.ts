import { cache } from 'react';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import {
  parseWorkspaceSettings,
  type WorkspaceSettings,
} from '@byte-of-me/contracts/workspace-settings';
import { prisma } from '@byte-of-me/db';
import { unstable_cache } from 'next/cache';

import 'server-only';

import { requireAdmin } from '@/shared/lib/auth';
import { LAYOUT_CACHE_REVALIDATE_SECONDS } from '@/shared/lib/constants';

/**
 * The database half of the workspace-settings reads, behind Next's data cache.
 * Exported for the server actions in this folder: each one calls `requireAdmin()`
 * itself and passes the admin's id here, so every caller shares one cache entry.
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
export const readWorkspaceSettings = (ownerId: string) =>
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
 * The owner's dashboard settings, read on the server.
 *
 * NOT a server action — no `'use server'` — so React's `cache()` can wrap it and
 * client code cannot import it. Server code that already runs on the server
 * calls it (the upload action, `uploadMedia`). Client components read the same
 * row through `workspaceSettingsQueries.current()`, which wraps
 * `getAdminWorkspaceSettings`.
 *
 * Reading on the SERVER rather than fetching after hydration is the whole
 * reason this table exists rather than another `localStorage` key: the first
 * frame already reflects what the author saved.
 *
 * Two caches, doing two different jobs. React's `cache()` on the outside gives
 * within-request dedupe: a render that reads the settings twice pays for one
 * read. Next's `unstable_cache` on the inside gives the across-request half,
 * which is the one that matters here — the `(protected)` group is
 * `force-dynamic`, so every navigation used to pay a Supabase round trip to
 * re-read a JSON blob that only changes when the author moves a switch. It is
 * tagged rather than left on a timer precisely because that switch has to
 * appear to save: a stale read here is indistinguishable, from the author's
 * chair, from the write having failed.
 *
 * `requireAdmin()` stays outside both caches. §5's rule is that a query guards
 * itself, and a cached callback has no session to guard with — so the guard
 * runs on every call, hit or miss, and only the row read is skipped.
 *
 * Fails closed. A caller who is not the owner gets the refusal `requireAdmin()`
 * throws, and a failed read throws as well. Nothing falls back to
 * `WORKSPACE_SETTINGS_DEFAULTS`: a silent default would have the upload path
 * compress with built-in settings instead of the owner's saved ones, and
 * nothing would say so.
 */
export const getWorkspaceSettings = cache(
  async (): Promise<WorkspaceSettings> => {
    const admin = await requireAdmin();

    return readWorkspaceSettings(admin.id);
  }
);
