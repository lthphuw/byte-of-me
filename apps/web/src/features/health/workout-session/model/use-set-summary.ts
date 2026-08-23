'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import type { WorkoutSetRow } from '@/entities/workout';

/**
 * One set as a sentence: "60 kg × 8", "12 reps", "45s".
 *
 * **Metric-aware, and built from one message per shape** rather than glued
 * together in code. A weighted set and a held position are different
 * sentences, not the same sentence with pieces missing, and a translator has
 * to see each whole — Vietnamese puts the unit where English does not. A set
 * with nothing filled in says so, because an empty row reads as a rendering
 * fault.
 *
 * A hook rather than a pure function because every branch is a translated
 * string. Extracted from `workout-exercise-card.tsx` when the live logger
 * needed the identical sentence: two copies of a metric switch is how one of
 * them ends up not knowing about `weighted_bodyweight` and quietly printing a
 * dip with 20 kg on a belt as a 20 kg lift.
 */
export function useSetSummary(): (
  set: WorkoutSetRow,
  metric: string
) => string {
  const t = useTranslations('dashboard.health.workout');

  return useCallback(
    (set: WorkoutSetRow, metric: string) => {
      if (metric === 'time') {
        return set.durationSec === null
          ? t('setEmpty')
          : t('setTime', { seconds: set.durationSec });
      }

      if (metric === 'bodyweight_reps') {
        return set.reps === null
          ? t('setEmpty')
          : t('setReps', { reps: set.reps });
      }

      if (set.weightKg !== null && set.reps !== null) {
        return metric === 'weighted_bodyweight'
          ? t('setAddedReps', { weight: set.weightKg, reps: set.reps })
          : t('setWeightReps', { weight: set.weightKg, reps: set.reps });
      }

      if (set.reps !== null) return t('setReps', { reps: set.reps });

      return t('setEmpty');
    },
    [t]
  );
}
