'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { routineArchiveSchema } from '@/entities/exercise/model/exercise-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Retire a routine, or bring it back.
 *
 * Archiving rather than deleting for a reason the schema states: a session
 * stores the routine name as a `title` SNAPSHOT and its `routineId` is
 * `onDelete: SetNull`, so deleting would silently cut every past session's
 * link back to the plan it came from. Archiving keeps that link and only
 * takes the routine out of the picker.
 *
 * See `update-exercise.ts` for why the owner predicate lives inside the
 * `updateMany` rather than in a check before it.
 */
export async function archiveRoutine(
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(routineArchiveSchema, input, 'archiveRoutine');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { count } = await prisma.routine.updateMany({
      where: { id: parsed.data.id, ownerId: session.id },
      data: { isArchived: parsed.data.isArchived },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Routine not found' };
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to archive routine');
    logger.error(`Archive routine error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
