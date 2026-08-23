'use client';

import { useQuery } from '@tanstack/react-query';

import { exerciseKeys, getRoutines } from '@/entities/exercise';
import { DEFAULT_REST_SEC } from '@/features/gym/workout-session/lib/set-increments';

/**
 * How long to rest after a set of a given exercise, per the routine the
 * session was started from.
 *
 * `restSec` is a property of a routine ITEM, not of the session — a session
 * snapshots the routine's NAME and nothing else, deliberately, so that deleting
 * "Push Day" does not blank the heading of sixty past workouts. The interval
 * therefore has to be looked up: routine → item for this exercise → `restSec`.
 *
 * A session started without a routine, a routine since deleted, an exercise
 * added mid-workout that the routine never planned: all three land on
 * `DEFAULT_REST_SEC`, which is what the timer is for anyway. The read is
 * prefetched by the screen's widget, so this resolves from the hydrated cache
 * rather than blocking the first set on a network round trip — and if it has
 * not arrived, the default is a correct answer rather than a placeholder.
 *
 * `exerciseKeys.routineList(false)` with `includeArchived: false` — the same
 * factory and the same argument the prefetch calls, or it silently falls
 * through to a client fetch (AGENTS §6). Archived routines are excluded
 * because an archived routine can still have a session running off it, and its
 * rest intervals are as valid as they were yesterday; what cannot happen is a
 * key that disagrees with the prefetch.
 */
export function useRoutineRest(
  routineId: string | null
): (exerciseId: string) => number {
  const { data } = useQuery({
    queryKey: exerciseKeys.routineList(false),
    queryFn: () => getRoutines({ includeArchived: false }),
    enabled: routineId !== null,
  });

  const routine =
    routineId === null || !data?.success
      ? null
      : data.data.find((row) => row.id === routineId) ?? null;

  return (exerciseId: string) => {
    const item = routine?.items.find((row) => row.exerciseId === exerciseId);

    return item?.restSec ?? DEFAULT_REST_SEC;
  };
}
