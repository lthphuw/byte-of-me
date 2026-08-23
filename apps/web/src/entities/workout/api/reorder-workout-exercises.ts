'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { workoutExerciseReorderSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Reorder the exercises inside a session.
 *
 * Takes the COMPLETE list and rejects anything else. The stored ids are read
 * back owner-scoped and compared as a set: a list missing a row would leave
 * that row's old position behind, colliding with a renumbered one, and
 * `WorkoutExercise` has no constraint on `(sessionId, position)` to catch it —
 * the result is a session whose order changes between two reads of the same
 * data. A list containing an id from ANOTHER session is rejected by the same
 * comparison, which is what keeps this from being a write primitive aimed at
 * rows the caller does not own.
 *
 * The renumbering runs in one transaction so a failure halfway cannot leave
 * two exercises sharing a position.
 */
export async function reorderWorkoutExercises(
  input: unknown
): Promise<ApiResponse<null>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      workoutExerciseReorderSchema,
      input,
      'reorderWorkoutExercises'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { sessionId, orderedIds } = parsed.data;

    const stored = await prisma.workoutExercise.findMany({
      where: { sessionId, session: { ownerId: session.id } },
      select: { id: true },
    });

    const storedIds = new Set(stored.map((row) => row.id));
    const requested = new Set(orderedIds);

    if (
      storedIds.size === 0 ||
      requested.size !== orderedIds.length ||
      requested.size !== storedIds.size ||
      orderedIds.some((exerciseId) => !storedIds.has(exerciseId))
    ) {
      return {
        success: false,
        errorMsg:
          'The order must list every exercise in this workout exactly once',
      };
    }

    await prisma.$transaction(
      orderedIds.map((exerciseId, index) =>
        prisma.workoutExercise.updateMany({
          // The owner predicate is restated here rather than trusted from the
          // check above: the check proves the set matches, this proves the
          // write cannot reach outside it even if that reasoning is ever
          // broken by an edit.
          where: { id: exerciseId, session: { ownerId: session.id } },
          data: { position: index },
        })
      )
    );

    return { success: true, data: null };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to reorder the workout');
    logger.error(`Reorder workout exercises error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
