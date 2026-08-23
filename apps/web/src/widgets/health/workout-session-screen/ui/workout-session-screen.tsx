import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { exerciseKeys, getExercises, getRoutines } from '@/entities/exercise';
import { getWorkoutSession, workoutKeys } from '@/entities/workout';
import { DEFAULT_EXERCISE_FILTERS } from '@/features/health/exercise-catalog';
import { WorkoutSessionView } from '@/features/health/workout-session';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { getQueryClient } from '@/shared/lib/query/get-query-client';

/**
 * One session, prefetched and then handed to the client view.
 *
 * Three reads. The session itself is the page. The exercise catalogue is here
 * because "add exercise" opens a picker over this screen, and a picker that
 * starts empty while it fetches is a modal with nothing in it — the worst
 * place to make someone wait, since there is nothing else on screen to read.
 * The routines are here for the rest timer: `restSec` is a property of a
 * routine ITEM, not of the session — a session snapshots the routine's name
 * and nothing else — so the interval to rest after a set has to be looked up,
 * and looking it up over the network on the first set of a workout is a
 * request made in the one building where it will not arrive.
 *
 * Every key comes from its factory with the same arguments the client hooks
 * use, so all three hydrate rather than refetch (AGENTS §6).
 *
 * `timeZone` is resolved on the SERVER and passed down. Every clock time on
 * this screen is formatted with it explicitly, so the markup the server sends
 * and the first client render agree — formatting in the browser's own zone
 * would differ from the server's and hydrate with a mismatch.
 *
 * A missing session is not an error here: `getWorkoutSession` answers
 * `{ success: true, data: null }` for both "no such session" and "not yours",
 * deliberately indistinguishable, and the editor renders a line and a way back
 * in place. Nothing throws, because a throw inside an RSC escapes to the root
 * `error.tsx` and replaces the page.
 */
export async function WorkoutSessionScreen({
  sessionId,
}: {
  sessionId: string;
}) {
  const timeZone = await getRequestTimeZone();
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: workoutKeys.detail(sessionId),
      queryFn: () => getWorkoutSession({ id: sessionId }),
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
    queryClient.prefetchQuery({
      queryKey: exerciseKeys.routineList(false),
      queryFn: () => getRoutines({ includeArchived: false }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkoutSessionView sessionId={sessionId} timeZone={timeZone} />
    </HydrationBoundary>
  );
}
