import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { exerciseKeys, getExercises } from '@/entities/exercise';
import {
  DEFAULT_EXERCISE_FILTERS,
  ExerciseCatalog,
} from '@/features/gym/exercise-catalog';
import { getQueryClient } from '@/shared/lib/query/get-query-client';

/**
 * The catalogue screen: a server prefetch of the unfiltered list, then the
 * client surface that owns the search box.
 *
 * The prefetch and the `useQuery` inside `ExerciseCatalog` call the SAME key
 * factory with the SAME arguments — `DEFAULT_EXERCISE_FILTERS` is the one
 * source of both, rather than three literals spelled out twice. A drifted key
 * does not raise; it silently falls through to a client fetch and leaves the
 * list on its loading line (AGENTS §6), which on a catalogue of 73 rows looks
 * exactly like an empty catalogue.
 *
 * Filtering changes the key and falls through to a live client fetch on
 * purpose. Enumerating the combinations to prefetch would be prefetching a
 * search box.
 *
 * Nothing here throws. `getExercises` returns an `ApiResponse` envelope rather
 * than raising, and `prefetchQuery` swallows what does raise, so a failed read
 * reaches the client as `{ success: false }` and is rendered in place — a
 * throw inside an RSC escapes to the root `error.tsx` and replaces the whole
 * page, navigation included.
 */
export async function ExerciseScreen() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: exerciseKeys.list(
      DEFAULT_EXERCISE_FILTERS.search,
      DEFAULT_EXERCISE_FILTERS.muscle,
      DEFAULT_EXERCISE_FILTERS.includeArchived
    ),
    queryFn: () =>
      getExercises({
        includeArchived: DEFAULT_EXERCISE_FILTERS.includeArchived,
      }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExerciseCatalog />
    </HydrationBoundary>
  );
}
