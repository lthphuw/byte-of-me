import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { exerciseKeys, getExercises } from '@/entities/exercise';
import { getWorkoutSession, workoutKeys } from '@/entities/workout';
import { DEFAULT_EXERCISE_FILTERS } from '@/features/health/exercise-catalog';
import { WorkoutSessionEditor } from '@/features/health/workout-session';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { getQueryClient } from '@/shared/lib/query/get-query-client';

/**
 * One session, prefetched and then handed to the client editor.
 *
 * Two reads. The session itself is the page. The exercise catalogue is here
 * because "add exercise" opens a picker over this screen, and a picker that
 * starts empty while it fetches is a modal with nothing in it — the worst
 * place to make someone wait, since there is nothing else on screen to read.
 * Both keys come from their factories with the same arguments the client hooks
 * use, so both hydrate rather than refetch (AGENTS §6).
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
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkoutSessionEditor sessionId={sessionId} timeZone={timeZone} />
    </HydrationBoundary>
  );
}
