'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { exerciseArchiveSchema } from '@/entities/exercise/model/exercise-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Hide a catalog entry, or bring it back.
 *
 * There is no delete, by design: `WorkoutExercise.exercise` is
 * `onDelete: Restrict` so that removing an entry cannot take the history of
 * training it with it. Archiving keeps every past session resolvable while
 * taking the row out of the picker.
 *
 * The toggle takes `isArchived` as an argument rather than splitting into two
 * actions, because un-archiving is the same write behind the same ownership
 * check. See `update-exercise.ts` for why the owner predicate lives inside
 * the `updateMany`.
 */
export async function archiveExercise(
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(exerciseArchiveSchema, input, 'archiveExercise');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { count } = await prisma.exercise.updateMany({
      where: { id: parsed.data.id, ownerId: session.id },
      data: { isArchived: parsed.data.isArchived },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Exercise not found' };
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to archive exercise');
    logger.error(`Archive exercise error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
