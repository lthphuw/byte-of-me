'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  archiveRoutine,
  createRoutine,
  exerciseKeys,
  getRoutines,
  type RoutineRow,
  updateRoutine,
} from '@/entities/exercise';
import {
  draftToPayload,
  type RoutineDraft,
} from '@/features/gym/routine-editor/lib/routine-drafts';

/**
 * Every routine the owner has, archived ones optionally included.
 *
 * The key comes from `exerciseKeys.routineList(includeArchived)` — the same
 * factory, with the same argument, that the server prefetch calls. A drifted
 * key falls through to a client fetch without raising and leaves the list on
 * its loading line (AGENTS §6).
 *
 * Each row arrives with its items already in performing order and with each
 * item's exercise name denormalised onto it, so the editor opens without a
 * second round trip. That is also why every exercise write invalidates
 * `exerciseKeys.routines()`: a rename would otherwise leave these copies
 * stale.
 */
export function useRoutines(includeArchived: boolean) {
  return useQuery({
    queryKey: exerciseKeys.routineList(includeArchived),
    queryFn: () => getRoutines({ includeArchived }),
    placeholderData: (previous) => previous,
  });
}

/**
 * The routine surface's two writes: save (create or replace) and archive.
 *
 * Both invalidate `exerciseKeys.routines()`, the PREFIX — a routine can enter
 * or leave either list depending on its archived flag, and enumerating two
 * booleans is not worth a bug when one of them is missed.
 *
 * A save REPLACES the item list rather than diffing it. That is the schema's
 * decision, and `routineUpdateSchema` records why: the editor has no stable
 * ids for rows it just added, and a partial update cannot express "this
 * exercise was removed". Nothing is lost — what actually happened in the gym
 * lives in `WorkoutExercise`, a different table for exactly this reason.
 *
 * The actions return an envelope rather than throwing, so `mutationFn` throws
 * on `success: false` itself. Without that, `onSuccess` fires on a rejected
 * write and the screen reports a save that did not happen.
 */
export function useRoutineMutations() {
  const t = useTranslations('dashboard.health.routines');
  const tError = useTranslations('dashboard.health.errors');
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: exerciseKeys.routines() });

  const save = useMutation({
    mutationFn: async (draft: RoutineDraft) => {
      const payload = draftToPayload(draft);

      const res = draft.id
        ? await updateRoutine({ id: draft.id, ...payload })
        : await createRoutine(payload);

      if (!res.success) throw new Error(res.errorMsg);

      return { row: res.data, wasUpdate: Boolean(draft.id) };
    },
    onSuccess: ({ wasUpdate }) => {
      toast.success(wasUpdate ? t('updated') : t('created'));
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || tError('save'));
    },
  });

  const archive = useMutation({
    mutationFn: async (input: { row: RoutineRow; isArchived: boolean }) => {
      const res = await archiveRoutine({
        id: input.row.id,
        isArchived: input.isArchived,
      });

      if (!res.success) throw new Error(res.errorMsg);

      return input.isArchived;
    },
    onSuccess: (isArchived) => {
      toast.success(isArchived ? t('archivedToast') : t('restoredToast'));
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || tError('save'));
    },
  });

  return {
    save: save.mutate,
    isSaving: save.isPending,
    setArchived: archive.mutate,
    /** Which routine is mid-archive, so only its own button shows the wait. */
    archivingId: archive.isPending ? archive.variables?.row.id ?? null : null,
  };
}
