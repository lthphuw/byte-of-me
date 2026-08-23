'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import { EXERCISE_SELECT, toExerciseRow } from './exercise-fields';

import { exerciseListSchema } from '@/entities/exercise/model/exercise-schema';
import type { ExerciseRow } from '@/entities/exercise/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * The owner's exercise catalog, optionally searched and filtered by muscle.
 *
 * `idx_exercises_owner_muscle` leads with `owner_id` and then
 * `primary_muscle`, which is exactly the filtered predicate. The search is a
 * case-insensitive `contains` on the name only — the catalog is one person's,
 * measured in dozens of rows, so a trigram index would be machinery for a
 * table that fits in a page.
 *
 * `secondaryMuscles` is NOT searched by the muscle filter, and that is
 * deliberate: the filter answers "what do I train this muscle with", and an
 * exercise that merely involves a muscle secondarily is not an answer to it.
 * The secondary list exists so per-muscle volume can be weighted later.
 *
 * Returns an empty array rather than throwing when the catalog is empty — a
 * read awaited by a server component must produce a usable object, since a
 * throw inside an RSC escapes to the root `error.tsx` and replaces the page
 * (`entities/note/api/get-space-stats.ts` documents this at length).
 */
export async function getExercises(
  input: unknown = {}
): Promise<ApiResponse<ExerciseRow[]>> {
  try {
    const session = await requireAdmin();

    const parsed = parseInput(exerciseListSchema, input, 'getExercises');
    if (!parsed.ok) {
      return { success: false, errorMsg: parsed.errorMsg };
    }

    const { search, muscle, includeArchived } = parsed.data;

    const rows = await prisma.exercise.findMany({
      where: {
        ownerId: session.id,
        ...(includeArchived ? {} : { isArchived: false }),
        ...(muscle ? { primaryMuscle: muscle } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ primaryMuscle: 'asc' }, { name: 'asc' }],
      select: EXERCISE_SELECT,
    });

    return { success: true, data: rows.map(toExerciseRow) };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load exercises');
    logger.error(`Get exercises error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
