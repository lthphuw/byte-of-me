'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { workoutSetIdSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Remove one logged set. A hard delete, unlike an exercise or a routine: a set
 * entered by mistake is noise, not history, and nothing joins to it.
 *
 * The owner predicate traverses the relation inside the delete itself, for the
 * reason `add-workout-set.ts` documents — a `WorkoutSet` has no `ownerId`.
 *
 * The remaining sets are deliberately NOT renumbered. Positions only have to
 * order, and closing the gap would rewrite every later row on every deletion
 * for a difference nobody can see.
 */
export async function deleteWorkoutSet(
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(workoutSetIdSchema, input, 'deleteWorkoutSet');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { count } = await prisma.workoutSet.deleteMany({
      where: {
        id: parsed.data.id,
        workoutExercise: { session: { ownerId: session.id } },
      },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Set not found' };
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete the set');
    logger.error(`Delete workout set error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
