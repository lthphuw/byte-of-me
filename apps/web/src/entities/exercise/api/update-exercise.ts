'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { EXERCISE_SELECT, toExerciseRow } from './exercise-fields';

import { exerciseUpdateSchema } from '@/entities/exercise/model/exercise-schema';
import type { ExerciseRow } from '@/entities/exercise/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Edit one catalog entry.
 *
 * `updateMany` rather than `update`, and this is the ownership pattern every
 * write in these two slices follows: the owner predicate travels INSIDE the
 * statement that mutates, so a row belonging to somebody else cannot be
 * touched even for the instant between a check and a write. `count === 0`
 * then means "no such exercise, for this caller" — the two reasons are
 * deliberately indistinguishable in the response, matching how `moveNote` and
 * `archiveNote` report a miss.
 *
 * The read-back is a second statement because `updateMany` returns only a
 * count. It is scoped to the owner too, so the pair cannot disagree.
 */
export async function updateExercise(
  input: unknown
): Promise<ApiResponse<ExerciseRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(exerciseUpdateSchema, input, 'updateExercise');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { id, ...fields } = parsed.data;

    const { count } = await prisma.exercise.updateMany({
      where: { id, ownerId: session.id },
      data: fields,
    });

    if (count === 0) {
      return { success: false, errorMsg: 'Exercise not found' };
    }

    const row = await prisma.exercise.findFirst({
      where: { id, ownerId: session.id },
      select: EXERCISE_SELECT,
    });

    if (!row) {
      return { success: false, errorMsg: 'Exercise not found' };
    }

    return { success: true, data: toExerciseRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to update exercise');
    logger.error(`Update exercise error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
