'use client';

import { useTranslations } from 'next-intl';

import type { ExerciseProgress } from '@/entities/gym-stats';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import {
  EQUIPMENT_ICON,
  iconForCode,
  METRIC_ICON,
} from '@/shared/ui/gym-icons';

/**
 * What this exercise is, in the reader's language.
 *
 * A client component inside an otherwise server-rendered screen, and the
 * reason is `useGymLabels`: next-intl only type-checks LITERAL message keys,
 * so the seventeen muscles, seven equipment codes and four metrics are spelled
 * out once in that hook rather than looked up with a computed `t(...)` that
 * type-checks against nothing. Every gym surface reads them from there.
 *
 * Icon AND word, never icon alone — the same rule `ExerciseCard` follows. A
 * picture of a cog could be a machine or a setting, and on a touch screen a
 * value that only a tooltip explains does not exist.
 */
export function ExerciseIdentity({
  exercise,
}: {
  exercise: Pick<
    ExerciseProgress,
    | 'name'
    | 'primaryMuscle'
    | 'secondaryMuscles'
    | 'equipment'
    | 'metric'
    | 'isArchived'
  >;
}) {
  const t = useTranslations('dashboard.gym.exercises');
  const labels = useGymLabels();

  const EquipmentIcon = iconForCode(EQUIPMENT_ICON, exercise.equipment);
  const MetricIcon = iconForCode(METRIC_ICON, exercise.metric);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="break-safe text-xl font-semibold">{exercise.name}</h2>

        {/* Archived is stated in words, never by fading: `opacity` is a colour
            signal on a palette with no colour to spare. */}
        {exercise.isArchived ? (
          <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {t('archived')}
          </span>
        ) : null}
      </div>

      <p className="break-safe flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{labelForCode(labels.muscle, exercise.primaryMuscle)}</span>

        <span className="inline-flex items-center gap-1">
          {EquipmentIcon ? (
            <EquipmentIcon aria-hidden className="size-3.5 shrink-0" />
          ) : null}
          {labelForCode(labels.equipment, exercise.equipment)}
        </span>

        <span className="inline-flex items-center gap-1">
          {MetricIcon ? (
            <MetricIcon aria-hidden className="size-3.5 shrink-0" />
          ) : null}
          {labelForCode(labels.metric, exercise.metric)}
        </span>
      </p>

      {exercise.secondaryMuscles.length > 0 ? (
        <p className="break-safe text-xs text-muted-foreground">
          {t('secondaryMuscles')}:{' '}
          {exercise.secondaryMuscles
            .map((code) => labelForCode(labels.muscle, code))
            .join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * "An estimated 1RM does not apply here, and this is what this exercise
 * records instead."
 *
 * Its own component for the same reason as the block above: the metric's name
 * is one of four literal keys, and the sentence is worthless without it.
 * `bestE1rmKg` refuses every metric but `weight_reps` — a `weighted_bodyweight`
 * set carries an unknown fraction of body mass on top of the belt plate, so
 * the recorded kilos are not the load being lifted — and this is the screen
 * state that says so rather than showing an empty chart.
 */
export function MetricNotApplicable({ metric }: { metric: string }) {
  const t = useTranslations('dashboard.gym.exerciseDetail');
  const labels = useGymLabels();

  return (
    <p className="text-sm text-muted-foreground">
      {t('notApplicable', { metric: labelForCode(labels.metric, metric) })}
    </p>
  );
}
