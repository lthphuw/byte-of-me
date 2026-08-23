'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import {
  toWorkoutExerciseRow,
  WORKOUT_EXERCISE_SELECT,
} from './workout-fields';

import type { WorkoutExerciseRow } from '@/entities/workout/model/types';
import { workoutExerciseAddSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Add a lift to a session that is already running.
 *
 * TWO ownership checks, not one, and they defend different things. The session
 * lookup stops a caller appending to somebody else's log. The exercise count
 * stops them naming somebody else's catalog entry: the foreign key proves the
 * exercise exists but says nothing about who owns it, and the session detail
 * read joins the entry in — so an unchecked id would hand back that stranger's
 * exercise name, muscle and equipment.
 *
 * `position` is the current exercise count, appending to the end. Never taken
 * from the client: `WorkoutExercise` has no unique constraint on
 * `(sessionId, position)`, so a collision would not fail — the list would just
 * render in an arbitrary order.
 */
export async function addWorkoutExercise(
  input: unknown
): Promise<ApiResponse<WorkoutExerciseRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      workoutExerciseAddSchema,
      input,
      'addWorkoutExercise'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { sessionId, exerciseId, notes } = parsed.data;

    const [target, ownedExercise] = await Promise.all([
      prisma.workoutSession.findFirst({
        where: { id: sessionId, ownerId: session.id },
        select: { id: true, _count: { select: { exercises: true } } },
      }),
      prisma.exercise.count({
        where: { id: exerciseId, ownerId: session.id },
      }),
    ]);

    if (!target) {
      return { success: false, errorMsg: 'Workout not found' };
    }

    if (ownedExercise === 0) {
      return { success: false, errorMsg: 'Exercise not found' };
    }

    const row = await prisma.workoutExercise.create({
      data: {
        sessionId: target.id,
        exerciseId,
        notes,
        position: target._count.exercises,
      },
      select: WORKOUT_EXERCISE_SELECT,
    });

    return { success: true, data: toWorkoutExerciseRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to add the exercise');
    logger.error(`Add workout exercise error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
