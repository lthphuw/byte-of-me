import { prisma } from '@byte-of-me/db';

/**
 * Every `exerciseId` a routine item names must belong to the caller.
 *
 * The foreign key on `RoutineExercise.exerciseId` only proves the row exists —
 * it says nothing about who owns it. Without this check a caller could post a
 * routine item naming another owner's exercise id and read that exercise's
 * name and muscle straight back out of `getRoutines`, which joins the catalog
 * entry in to render the plan. Owner scoping on the routine alone does not
 * close that: the leak is through the item, not the routine.
 *
 * Ids are de-duplicated before counting because a routine may legitimately
 * program the same lift twice (a top set and a back-off block are two items),
 * so `count` against the raw list would under-match and reject a valid plan.
 *
 * No `'use server'`: this is an internal helper for two actions in this
 * directory, not an endpoint, and it is not re-exported from `api/index.ts`.
 */
export async function areExercisesOwnedBy(
  exerciseIds: string[],
  ownerId: string
): Promise<boolean> {
  const ids = [...new Set(exerciseIds)];
  if (ids.length === 0) return true;

  const owned = await prisma.exercise.count({
    where: { id: { in: ids }, ownerId },
  });

  return owned === ids.length;
}
