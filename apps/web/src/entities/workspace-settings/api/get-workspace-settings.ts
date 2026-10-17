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
 * The row read behind Next's data cache; each action calls `requireAdmin()` and passes the id here.
 * `ownerId` is an argument and in the key: a cached callback has no session, and a key without it
 * would seed one account from another's. Caches the PARSED object, so a hit is already defaulted.
 */
export const readWorkspaceSettings = (ownerId: string) =>
  unstable_cache(
    async () => {
      const row = await prisma.workspaceSettings.findUnique({
        where: { ownerId },
        select: { preferences: true },
      });

      // `parseWorkspaceSettings(undefined)` returns the defaults, which covers the common no-row
      // case.
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
 * Server-only (no `'use server'`, so `cache()` works; clients use
 * `workspaceSettingsQueries.current()`). `requireAdmin()` runs on every call, outside both caches.
 * Fails closed: no defaults fallback, which would silently mis-compress uploads.
 */
export const getWorkspaceSettings = cache(
  async (): Promise<WorkspaceSettings> => {
    const admin = await requireAdmin();

    return readWorkspaceSettings(admin.id);
  }
);
