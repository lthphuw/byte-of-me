import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { exerciseKeys, getExercises, getRoutines } from '@/entities/exercise';
import { DEFAULT_EXERCISE_FILTERS } from '@/features/health/exercise-catalog';
import {
  DEFAULT_ROUTINE_INCLUDE_ARCHIVED,
  RoutineManager,
} from '@/features/health/routine-editor';
import { getQueryClient } from '@/shared/lib/query/get-query-client';

/**
 * The routine screen: two server prefetches, then the client surface.
 *
 * TWO, because the editor opens over this page rather than navigating away
 * from it, and the picker inside it reads the same
 * `exerciseKeys.list(...)` entry the catalogue screen fills. Prefetching only
 * the routines would leave the first "add exercise" tap waiting on a round
 * trip inside a modal, which is the worst place to wait — there is nothing
 * else on screen to read.
 *
 * Both keys come from the factories with the same arguments the client hooks
 * pass, taken from the two shared defaults rather than spelled out again here.
 * A key that drifts does not raise: it falls through to a client fetch and
 * leaves the list on skeletons (AGENTS §6).
 *
 * Neither read throws. Both actions return an `ApiResponse` envelope, and
 * `prefetchQuery` swallows what does raise, so a failure reaches the client as
 * `{ success: false }` and is rendered in place — a throw inside an RSC
 * escapes to the root `error.tsx` and replaces the page and its navigation.
 */
export async function RoutinesScreen() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: exerciseKeys.routineList(DEFAULT_ROUTINE_INCLUDE_ARCHIVED),
      queryFn: () =>
        getRoutines({ includeArchived: DEFAULT_ROUTINE_INCLUDE_ARCHIVED }),
    }),
    queryClient.prefetchQuery({
      queryKey: exerciseKeys.list(
        DEFAULT_EXERCISE_FILTERS.search,
        DEFAULT_EXERCISE_FILTERS.muscle,
        DEFAULT_EXERCISE_FILTERS.includeArchived
      ),
      queryFn: () =>
        getExercises({
          includeArchived: DEFAULT_EXERCISE_FILTERS.includeArchived,
        }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RoutineManager />
    </HydrationBoundary>
  );
}
