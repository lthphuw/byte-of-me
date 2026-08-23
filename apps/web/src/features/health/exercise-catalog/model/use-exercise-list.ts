'use client';

import { useQuery } from '@tanstack/react-query';

import { exerciseKeys, getExercises } from '@/entities/exercise';
import type { ExerciseFilters } from '@/features/health/exercise-catalog/lib/exercise-filters';

/**
 * One filtered catalogue read.
 *
 * The key comes from `exerciseKeys.list` with exactly the three fields
 * `exerciseListSchema` declares, in its order — never an inline literal. A
 * server prefetch calls the same factory with `DEFAULT_EXERCISE_FILTERS`; a
 * key that disagrees does not raise, it falls through to a client fetch and
 * leaves skeletons on screen (AGENTS §6).
 *
 * The empty strings become `undefined` HERE, at the action boundary, and never
 * in the key: the schema reads an absent `search` as "no filter" and would
 * reject `muscle: ''` as an unknown enum member, while the key needs a stable
 * serializable value for the same state. Two representations of "no filter",
 * one on each side of the boundary, converted in exactly one place.
 *
 * `placeholderData` keeps the previous list on screen while a new filter
 * resolves. Without it, typing empties the page on every keystroke, which
 * reads as "no results" for as long as the round trip takes.
 */
export function useExerciseList(filters: ExerciseFilters) {
  const { search, muscle, includeArchived } = filters;

  return useQuery({
    queryKey: exerciseKeys.list(search, muscle, includeArchived),
    queryFn: () =>
      getExercises({
        search: search === '' ? undefined : search,
        muscle: muscle === '' ? undefined : muscle,
        includeArchived,
      }),
    placeholderData: (previous) => previous,
  });
}
