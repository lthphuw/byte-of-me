'use server';

import type { ApiResponse } from '@byte-of-me/api-core';
import { CACHE_TAGS } from '@byte-of-me/api-core';
import { parseInput } from '@byte-of-me/api-core/server';
import {
  parseWorkspaceSettings,
  type WorkspaceSettings,
  type WorkspaceSettingsPatch,
  workspaceSettingsPatchSchema,
} from '@byte-of-me/contracts/workspace-settings';
import { Prisma, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { revalidateTag } from 'next/cache';

import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';

/**
 * Writes a SUBSET and returns the full, re-parsed result; a whole-object write would revert another
 * tab's edits. The merge is in Postgres (`jsonb || jsonb`, one atomic statement), so no
 * read-modify-write race can open.
 */
export async function updateWorkspaceSettings(
  input: WorkspaceSettingsPatch
): Promise<ApiResponse<WorkspaceSettings>> {
  const session = await requireAdmin();

  try {
    const parsed = parseInput(workspaceSettingsPatchSchema, input);
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    // Re-serialized from the PARSED value, never from `input`: zod has
    // stripped anything not in the schema, so an extra key a caller invented
    // cannot reach the column and start accumulating there.
    const patch = JSON.stringify(parsed.data);

    // Ordinary case: the row exists and the two objects are merged in place.
    // `updated_at` is set explicitly because raw SQL bypasses Prisma's
    // `@updatedAt`, which is applied by the client rather than by the database.
    const updated = await prisma.$executeRaw`
      UPDATE workspace_settings
      SET preferences = preferences || ${patch}::jsonb,
          updated_at = now()
      WHERE owner_id = ${session.id}
    `;

    if (updated === 0) {
      try {
        // First write for this author. Via the Prisma client, not raw SQL, so `id` gets its
        // `@default(cuid())` instead of a hand-made id in a different format.
        await prisma.workspaceSettings.create({
          data: {
            ownerId: session.id,
            preferences: parsed.data as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        // Two tabs both writing for the first time: one create wins, the other
        // hits the `owner_id` unique index. The loser's patch is not lost — it
        // simply belongs in the merge path now, so run it.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          await prisma.$executeRaw`
            UPDATE workspace_settings
            SET preferences = preferences || ${patch}::jsonb,
                updated_at = now()
            WHERE owner_id = ${session.id}
          `;
        } else {
          throw error;
        }
      }
    }

    const row = await prisma.workspaceSettings.findUnique({
      where: { ownerId: session.id },
      select: { preferences: true },
    });

    // `readWorkspaceSettings` is cached; without this the next full load paints the OLD value.
    // After the write and outside any transaction, per §8.
    revalidateTag(CACHE_TAGS.WORKSPACE_SETTINGS, 'max');

    // Re-parsed, not echoing the patch: the caller needs what the database now holds,
    // including any field ANOTHER tab changed in between.
    return { success: true, data: parseWorkspaceSettings(row?.preferences) };
  } catch (error) {
    logger.error(`Update workspace settings failed: ${String(error)}`);
    return { success: false, errorMsg: getErrorMessage(error) };
  }
}
