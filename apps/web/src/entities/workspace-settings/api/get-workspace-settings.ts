import { cache } from 'react';
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import 'server-only';

import {
  parseWorkspaceSettings,
  WORKSPACE_SETTINGS_DEFAULTS,
  type WorkspaceSettings,
} from '@/entities/workspace-settings/model/settings-schema';
import { requireAdmin } from '@/shared/lib/auth';

/**
 * The author's workspace settings, read on the server.
 *
 * NOT a server action — no `'use server'` — for the same reason
 * `getOwnerDisplayName` is not one: that is what allows React's `cache()`, and
 * `cache()` is the point. `space/layout.tsx` reads this to seed the settings
 * provider, and anything else rendering in the same request gets the answer
 * for free.
 *
 * Reading on the SERVER rather than fetching after hydration is the whole
 * reason this table exists rather than another `localStorage` key. Density,
 * type scale and line length are LAYOUT: read them in an effect and the
 * workspace paints once at the default and then jumps, which is exactly the
 * flash `use-explorer-prefs.ts` documents itself as accepting. Seeded from the
 * server, the first frame is already correct.
 *
 * Deliberately not going through TanStack Query's prefetch/hydrate path either.
 * That machinery earns its keep for lists that refetch and mutate; this is one
 * flat object read once per page load, and the failure mode of getting the
 * hydration key wrong is a workspace stuck on skeletons with nothing logged.
 *
 * Never throws. A settings read that fails must not take down a page that has
 * already begun rendering, and every field has a defined default — so the
 * fallback is a fully usable workspace rather than an error.
 */
export const getWorkspaceSettings = cache(
  async (): Promise<WorkspaceSettings> => {
    try {
      const admin = await requireAdmin();

      const row = await prisma.workspaceSettings.findUnique({
        where: { ownerId: admin.id },
        select: { preferences: true },
      });

      // `parseWorkspaceSettings` handles the no-row case too — `undefined` is
      // not an object, so it returns the defaults. The row is absent for every
      // author until the first time they change something, which is the
      // overwhelmingly common case and not worth a branch.
      return parseWorkspaceSettings(row?.preferences);
    } catch (error) {
      logger.warn(`Get workspace settings failed: ${String(error)}`);
      return { ...WORKSPACE_SETTINGS_DEFAULTS };
    }
  }
);
