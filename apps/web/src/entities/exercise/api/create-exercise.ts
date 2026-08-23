'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { EXERCISE_SELECT, toExerciseRow } from './exercise-fields';

import { exerciseCreateSchema } from '@/entities/exercise/model/exercise-schema';
import type { ExerciseRow } from '@/entities/exercise/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Add one entry to the owner's catalog.
 *
 * `uniq_exercises_owner_name` is what per-exercise statistics depend on, so a
 * duplicate name is rejected by the database rather than deduplicated here —
 * a select-then-insert would leave a race in the middle, and this write is
 * the only path into the table. The unique violation surfaces through
 * `errorMsg` like any other Prisma failure.
 *
 * `requireAdmin`, despite the name, is the IDENTITY check for the single site
 * owner (`getAuthenticatedAdmin` narrows on `isSiteOwnerEmail`), which is
 * exactly right for a private training log. It is called here and not merely
 * in the layout because a server action is an addressable endpoint that never
 * renders one (AGENTS §5).
 */
export async function createExercise(
  input: unknown
): Promise<ApiResponse<ExerciseRow>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(exerciseCreateSchema, input, 'createExercise');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const row = await prisma.exercise.create({
      data: { ...parsed.data, ownerId: session.id },
      select: EXERCISE_SELECT,
    });

    return { success: true, data: toExerciseRow(row) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to create exercise');
    logger.error(`Create exercise error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
