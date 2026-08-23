'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { workoutExerciseIdSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Take a lift back out of a session, with the sets logged against it.
 *
 * `WorkoutSet.workoutExercise` is `onDelete: Cascade`, so the sets go with it —
 * which is right: they are the sets OF this exercise and mean nothing without
 * it. That is also why this deletes rather than archives, unlike a catalog
 * entry: removing a lift from one session is a correction to that session, not
 * a change to the history of the lift.
 *
 * The owner predicate traverses `session.ownerId` inside the delete. The
 * survivors are not renumbered, for the reason `delete-workout-set.ts` gives:
 * positions only have to order.
 */
export async function removeWorkoutExercise(
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      workoutExerciseIdSchema,
      input,
      'removeWorkoutExercise'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { count } = await prisma.workoutExercise.deleteMany({
      where: {
        id: parsed.data.id,
        session: { ownerId: session.id },
      },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Workout exercise not found' };
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to remove the exercise');
    logger.error(`Remove workout exercise error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
