'use server';

import { Prisma, prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  parseWorkspaceSettings,
  type WorkspaceSettings,
  type WorkspaceSettingsPatch,
  workspaceSettingsPatchSchema,
} from '@/entities/workspace-settings/model/settings-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Writes a SUBSET of the settings and returns the full, re-parsed result.
 *
 * A patch rather than a whole-object write, and that is not just economy. Two
 * tabs open on the same account each hold their own copy of the settings; a
 * whole-object write from one would silently revert whatever the other had
 * changed in the meantime. Patching narrows that to the same field being
 * changed in both places, where last-write-wins is the only answer anyway.
 *
 * The merge happens in POSTGRES, not in JavaScript. `jsonb || jsonb` is a
 * single atomic statement, so the read-modify-write race the paragraph above
 * describes cannot open up between our own read and our own write either.
 * Doing it in application code would have reintroduced exactly the problem the
 * patch shape exists to avoid.
 */
export async function updateWorkspaceSettings(
  input: WorkspaceSettingsPatch
): Promise<ApiResponse<WorkspaceSettings>> {
  try {
    const session = await requireAdmin();

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
        // First write for this author. Through the Prisma client rather than
        // more raw SQL so `id` gets its `@default(cuid())` — a raw INSERT would
        // have to invent an id, and inventing one in a different format from
        // every other row in the database is the kind of thing nobody notices
        // until something sorts by it.
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

    // Returned re-parsed rather than echoing the patch back: the caller applies
    // this to its own state, and what it needs is what the database now holds
    // merged over the defaults — including any field ANOTHER tab changed in
    // between, which the echo would have hidden.
    return { success: true, data: parseWorkspaceSettings(row?.preferences) };
  } catch (error) {
    logger.error(`Update workspace settings failed: ${String(error)}`);
    return { success: false, errorMsg: getErrorMessage(error) };
  }
}
