'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getOpenWorkoutSession,
  startWorkoutSession,
  workoutKeys,
} from '@/entities/workout';
import { useRouter } from '@/shared/i18n/navigation';

/**
 * Is a workout still running?
 *
 * `endedAt IS NULL` is the entire definition of "in progress" — the schema
 * carries no status column — and this is the question the gym surface opens
 * with. "None" is `{ success: true, data: null }`, not a failure, which is why
 * the panel above it renders a start form rather than an error for the
 * overwhelmingly common case.
 *
 * A CLIENT query rather than a value the server component reads once, and that
 * is the load-bearing choice on this screen: it makes "a workout is already
 * open" a live state instead of a snapshot. `startWorkoutSession` refuses a
 * second open session, and when it does, this query is refetched and the panel
 * re-renders itself into its Resume form — the refusal becomes the screen's
 * state rather than a toast the reader has to act on.
 */
export function useOpenWorkout() {
  return useQuery({
    queryKey: workoutKeys.open(),
    queryFn: () => getOpenWorkoutSession(),
  });
}

/**
 * Open a session, from a routine or empty.
 *
 * `startedAt` and `timeZone` are read from the DEVICE at submit, not from the
 * server render, for the same reason `useSleepEntry` reads them there: the
 * screen's zone comes from a geo header and is a good guess, the device's is
 * the fact, and `localDate` — the column phase 3 joins sleep and training on —
 * is derived server-side from exactly this pair. `localDate` is never sent;
 * letting the caller name the day would put it under their control.
 *
 * On success it navigates to the new session and THEN invalidates. That order
 * is not cosmetic: Next's router queues work behind a pending server action,
 * and invalidating first has stranded a navigation in this repo before — the
 * UI hangs with no failed request to point at.
 *
 * On failure it refetches the open session before showing the message. The one
 * failure worth designing for is "a workout is already in progress", and the
 * useful response to it is not an apology — it is the panel redrawing itself
 * with a Resume button pointing at the session that is already open.
 */
export function useStartWorkout() {
  const tError = useTranslations('dashboard.health.errors');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: { routineId: string | null; title: string }) => {
      const res = await startWorkoutSession({
        routineId: input.routineId,
        // The schema requires a title only when there is no routine; with one,
        // the action snapshots the routine's name instead. Sending null in
        // that case is what lets it.
        title: input.routineId ? null : input.title.trim(),
        startedAt: new Date().toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!res.success) throw new Error(res.errorMsg);

      return res.data;
    },
    onSuccess: (session) => {
      router.push(`/space/health/gym/${session.id}`);
      queryClient.invalidateQueries({ queryKey: workoutKeys.open() });
      queryClient.invalidateQueries({ queryKey: workoutKeys.ranges() });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.open() });
      toast.error(error.message || tError('save'));
    },
  });
}
