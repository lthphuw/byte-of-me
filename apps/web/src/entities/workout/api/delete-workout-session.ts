'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { workoutSessionIdSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Delete a session, with its exercises and every set in it.
 *
 * A hard delete, and the cascade is the schema's:
 * `WorkoutExercise.session` and `WorkoutSet.workoutExercise` are both
 * `onDelete: Cascade`, so one statement is enough. Nothing outside the session
 * points at those rows, and the catalog entries they reference are untouched —
 * `WorkoutExercise.exercise` is `onDelete: Restrict`, which constrains
 * deleting an EXERCISE, not deleting a session that used one.
 *
 * There is no soft delete here, unlike an exercise or a routine, because
 * nothing joins to a past session: archiving it would only hide a row that has
 * no other readers.
 */
export async function deleteWorkoutSession(
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      workoutSessionIdSchema,
      input,
      'deleteWorkoutSession'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { count } = await prisma.workoutSession.deleteMany({
      where: { id: parsed.data.id, ownerId: session.id },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Workout not found' };
    }

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to delete the workout');
    logger.error(`Delete workout session error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
