'use client';

import { useQuery } from '@tanstack/react-query';

import { getWorkoutSessions, workoutKeys } from '@/entities/workout';
import { historyRange } from '@/features/gym/workout-log/lib/history-range';

/**
 * One window of training history, newest day first.
 *
 * The key is `workoutKeys.range(from, to)` with the two strings `historyRange`
 * derives from the server-resolved `todayKey` — the same function the server
 * prefetch calls with the same day and the same default window, so the default
 * view hydrates instead of refetching. Choosing a different window changes the
 * key and falls through to a live client fetch on purpose; prefetching all
 * three would be prefetching a control nobody has touched yet.
 *
 * `placeholderData` keeps the current list up while a wider window loads.
 * Ninety days of sessions replaced by an empty box for the length of a round
 * trip reads as "the history is gone".
 */
export function useWorkoutHistory(todayKey: string, days: number) {
  const { from, to } = historyRange(todayKey, days);

  return useQuery({
    queryKey: workoutKeys.range(from, to),
    queryFn: () => getWorkoutSessions({ from, to }),
    placeholderData: (previous) => previous,
  });
}
