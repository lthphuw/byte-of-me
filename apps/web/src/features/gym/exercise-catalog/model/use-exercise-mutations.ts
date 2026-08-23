'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  archiveExercise,
  createExercise,
  exerciseKeys,
  type ExerciseRow,
  updateExercise,
} from '@/entities/exercise';

/** What the form edits. `id` decides create versus update; everything else is
 *  exactly `exerciseCreateSchema`'s field list. */
export interface ExerciseFormValues {
  id: string | null;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  metric: string;
}

/**
 * The catalogue's three writes.
 *
 * Every one of them invalidates `exerciseKeys.lists()` — the PREFIX, not one
 * filtered list. A new or renamed row can enter or leave any live filter
 * combination, and enumerating those is not worth it; the key factory carries
 * that reasoning in its own comment.
 *
 * A save also invalidates `exerciseKeys.routines()`, which is easy to miss:
 * `RoutineItemRow` carries `exerciseName` and `primaryMuscle` as denormalised
 * display fields so a routine renders without a second round trip, so renaming
 * "Bench press" leaves every cached routine showing the old name until
 * something else happens to refetch them.
 *
 * The actions return an `ApiResponse` envelope rather than throwing, so a
 * failure resolves like a success as far as TanStack is concerned. Each
 * `mutationFn` therefore throws on `success: false` itself — otherwise
 * `onSuccess` fires on a rejected write and the screen reports a save that
 * never happened.
 */
export function useExerciseMutations() {
  const t = useTranslations('dashboard.health.exercises');
  const tError = useTranslations('dashboard.health.errors');
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() });
    queryClient.invalidateQueries({ queryKey: exerciseKeys.routines() });
  };

  const save = useMutation({
    mutationFn: async (values: ExerciseFormValues) => {
      const payload = {
        name: values.name.trim(),
        primaryMuscle: values.primaryMuscle,
        secondaryMuscles: values.secondaryMuscles,
        equipment: values.equipment,
        metric: values.metric,
      };

      const res = values.id
        ? await updateExercise({ id: values.id, ...payload })
        : await createExercise(payload);

      if (!res.success) throw new Error(res.errorMsg);

      return { row: res.data, wasUpdate: Boolean(values.id) };
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
    mutationFn: async (input: { row: ExerciseRow; isArchived: boolean }) => {
      const res = await archiveExercise({
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
    /** Which row is mid-archive, so only its own button shows the wait. */
    archivingId: archive.isPending ? archive.variables?.row.id ?? null : null,
  };
}
