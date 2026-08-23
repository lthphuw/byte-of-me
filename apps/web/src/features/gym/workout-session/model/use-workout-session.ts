'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  addWorkoutExercise,
  addWorkoutSet,
  deleteWorkoutSession,
  deleteWorkoutSet,
  finishWorkoutSession,
  getWorkoutSession,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  updateWorkoutSet,
  workoutKeys,
} from '@/entities/workout';
import {
  draftToSetPayload,
  type SetDraft,
} from '@/features/gym/workout-session/lib/set-drafts';
import { useRouter } from '@/shared/i18n/navigation';

/** One session with its exercises and their sets, in performing order. */
export function useWorkoutSession(id: string) {
  return useQuery({
    queryKey: workoutKeys.detail(id),
    queryFn: () => getWorkoutSession({ id }),
  });
}

/**
 * Every write the session screen makes.
 *
 * **All of them invalidate `workoutKeys.open()` as well as this session's
 * detail.** That is easy to leave out and produces a specific, confusing bug:
 * the gym screen's start panel reads the open session and counts its exercises
 * and sets, so adding a set here and navigating back would show the old
 * counts — or, after finishing, a Resume button for a session that is over.
 *
 * Finishing and deleting also invalidate `workoutKeys.ranges()`, the PREFIX:
 * the row enters or leaves any history window containing its day, and
 * enumerating the live windows is not worth the one that gets missed.
 *
 * Every action returns an `ApiResponse` envelope rather than throwing, so a
 * rejected write resolves like a successful one as far as TanStack is
 * concerned. Each `mutationFn` therefore throws on `success: false` itself —
 * otherwise `onSuccess` fires on a write that never happened and the screen
 * reports a save it did not make.
 */
export function useWorkoutSessionMutations(sessionId: string) {
  const t = useTranslations('dashboard.health.workout');
  const tError = useTranslations('dashboard.health.errors');
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidateSession = () => {
    queryClient.invalidateQueries({ queryKey: workoutKeys.detail(sessionId) });
    queryClient.invalidateQueries({ queryKey: workoutKeys.open() });
  };

  const onError = (error: Error) => {
    toast.error(error.message || tError('save'));
  };

  const saveSet = useMutation({
    mutationFn: async (input: {
      draft: SetDraft;
      workoutExerciseId: string;
    }) => {
      const payload = draftToSetPayload(input.draft);

      const res = input.draft.id
        ? await updateWorkoutSet({ id: input.draft.id, ...payload })
        : await addWorkoutSet({
            workoutExerciseId: input.workoutExerciseId,
            ...payload,
          });

      if (!res.success) throw new Error(res.errorMsg);

      return res.data;
    },
    onSuccess: () => {
      toast.success(t('setSaved'));
      invalidateSession();
    },
    onError,
  });

  const removeSet = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteWorkoutSet({ id });
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: () => {
      toast.success(t('setDeleted'));
      invalidateSession();
    },
    onError,
  });

  const addExercise = useMutation({
    mutationFn: async (exerciseId: string) => {
      const res = await addWorkoutExercise({
        sessionId,
        exerciseId,
        notes: null,
      });

      if (!res.success) throw new Error(res.errorMsg);

      return res.data;
    },
    onSuccess: () => {
      toast.success(t('exerciseAdded'));
      invalidateSession();
    },
    onError,
  });

  const removeExercise = useMutation({
    mutationFn: async (id: string) => {
      const res = await removeWorkoutExercise({ id });
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: () => {
      toast.success(t('exerciseRemoved'));
      invalidateSession();
    },
    onError,
  });

  const reorder = useMutation({
    // The COMPLETE list, never a from/to pair: the action rejects any list that
    // is not exactly this session's own exercises, which is what makes a
    // partial order — and the duplicate positions it would leave behind —
    // impossible rather than merely unlikely.
    mutationFn: async (orderedIds: string[]) => {
      const res = await reorderWorkoutExercises({ sessionId, orderedIds });
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: invalidateSession,
    onError,
  });

  const finish = useMutation({
    mutationFn: async (input: {
      sessionRpe: number | null;
      notes: string | null;
    }) => {
      const res = await finishWorkoutSession({
        id: sessionId,
        // The device's clock, at the moment the button is pressed. The action
        // refuses an end before the stored start rather than storing a
        // negative duration that would feed every downstream figure.
        endedAt: new Date().toISOString(),
        sessionRpe: input.sessionRpe,
        notes: input.notes,
      });

      if (!res.success) throw new Error(res.errorMsg);

      return res.data;
    },
    onSuccess: () => {
      toast.success(t('finished'));
      invalidateSession();
      queryClient.invalidateQueries({ queryKey: workoutKeys.ranges() });
    },
    onError,
  });

  const removeSession = useMutation({
    mutationFn: async () => {
      const res = await deleteWorkoutSession({ id: sessionId });
      if (!res.success) throw new Error(res.errorMsg);
    },
    onSuccess: () => {
      toast.success(t('deleted'));

      // Navigate BEFORE invalidating. Next's router queues work behind a
      // pending server action, and invalidating first has stranded a
      // navigation in this repo before — the UI hangs with no failed request
      // to point at. The session this page reads no longer exists, so staying
      // here is not an option either.
      router.push('/space/health/gym');
      queryClient.invalidateQueries({ queryKey: workoutKeys.open() });
      queryClient.invalidateQueries({ queryKey: workoutKeys.ranges() });
    },
    onError,
  });

  return {
    saveSet: saveSet.mutate,
    isSavingSet: saveSet.isPending,
    removeSet: removeSet.mutate,
    addExercise: addExercise.mutate,
    isAddingExercise: addExercise.isPending,
    removeExercise: removeExercise.mutate,
    reorder: reorder.mutate,
    isReordering: reorder.isPending,
    finish: finish.mutate,
    isFinishing: finish.isPending,
    removeSession: removeSession.mutate,
    isRemovingSession: removeSession.isPending,
  };
}
