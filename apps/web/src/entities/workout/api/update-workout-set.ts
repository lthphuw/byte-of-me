'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { SET_SELECT, toSetRow } from './workout-fields';

import type { WorkoutSetRow } from '@/entities/workout/model/types';
import { workoutSetUpdateSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Correct one logged set.
 *
 * The owner predicate travels through the relation — `workoutExercise.session.
 * ownerId` — inside the statement that mutates, because a `WorkoutSet` carries
 * no `ownerId` of its own (see `add-workout-set.ts`). `count === 0` is what
 * reports a miss; "no such set" and "not yours" stay indistinguishable.
 *
 * `position` is not editable here. Reordering sets within an exercise is not a
 * thing the log does — a set's position IS the order it was performed in.
 */
export async function updateWorkoutSet(
  input: unknown
): Promise<ApiResponse<WorkoutSetRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(
      workoutSetUpdateSchema,
      input,
      'updateWorkoutSet'
    );
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { id, completedAt, ...fields } = parsed.data;
    const owned = { id, workoutExercise: { session: { ownerId: session.id } } };

    const { count } = await prisma.workoutSet.updateMany({
      where: owned,
      data: {
        ...fields,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Set not found' };
    }

    const row = await prisma.workoutSet.findFirst({
      where: owned,
      select: SET_SELECT,
    });

    if (!row) {
      return { success: false, errorMsg: 'Set not found' };
    }

    return { success: true, data: toSetRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update the set');
    logger.error(`Update workout set error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
