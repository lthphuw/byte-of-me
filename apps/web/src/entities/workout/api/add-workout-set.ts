'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { SET_SELECT, toSetRow } from './workout-fields';

import type { WorkoutSetRow } from '@/entities/workout/model/types';
import { workoutSetAddSchema } from '@/entities/workout/model/workout-schema';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Append one set to an exercise inside a session.
 *
 * THE ownership check in this slice, and the reason it is not obvious: a
 * `WorkoutSet` has no `ownerId`. It hangs off a `WorkoutExercise`, which hangs
 * off a `WorkoutSession`, and only the session knows who owns it. So the guard
 * has to traverse — `workoutExercise.session.ownerId` — and a write that
 * scoped only on `workoutExerciseId` would happily log sets into a stranger's
 * training log, because a cuid is the only thing standing in the way.
 *
 * The parent lookup is that traversal, and it earns its round trip twice
 * over: it also returns the current set count, which is the next `position`.
 * `position` is never accepted from the client — `WorkoutSet` has no unique
 * constraint on `(workoutExerciseId, position)`, so two sets logged in quick
 * succession would collide silently and render in an arbitrary order.
 *
 * The create itself cannot re-state the owner predicate (a nested create has
 * no `where`), which is exactly why the lookup above must be a query and not a
 * client-supplied claim.
 */
export async function addWorkoutSet(
  input: unknown
): Promise<ApiResponse<WorkoutSetRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(workoutSetAddSchema, input, 'addWorkoutSet');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { workoutExerciseId, completedAt, ...fields } = parsed.data;

    const parent = await prisma.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        session: { ownerId: session.id },
      },
      select: { id: true, _count: { select: { sets: true } } },
    });

    if (!parent) {
      return { success: false, errorMsg: 'Workout exercise not found' };
    }

    const row = await prisma.workoutSet.create({
      data: {
        ...fields,
        workoutExerciseId: parent.id,
        position: parent._count.sets,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
      select: SET_SELECT,
    });

    return { success: true, data: toSetRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to add the set');
    logger.error(`Add workout set error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
