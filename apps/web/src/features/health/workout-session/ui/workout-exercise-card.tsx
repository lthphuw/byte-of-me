'use client';

import { Button } from '@byte-of-me/ui';
import { ChevronDown, ChevronUp, Flame, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WorkoutExerciseRow, WorkoutSetRow } from '@/entities/workout';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { cn } from '@/shared/lib/utils';
import { EQUIPMENT_ICON, iconForCode } from '@/shared/ui/gym-icons';

/**
 * One exercise inside a session: its position, its sets, and the two controls
 * that change either.
 *
 * **Every set row is a button.** Tapping it opens the set editor on that set —
 * there is no separate edit affordance, because a set is four numbers and the
 * numbers themselves are the target. That keeps the list a list of numbers
 * rather than a list of numbers with a pencil and a bin beside each one, and
 * it makes the row a 44px target instead of a 44px button inside a row.
 *
 * **A set's summary is metric-aware**, built from one message per shape rather
 * than glued together in code: "60 kg × 8" and "45s" are different sentences,
 * not the same sentence with pieces missing, and a translator has to see each
 * whole. A set with nothing filled in says so — an empty row would look like a
 * rendering fault.
 *
 * Reordering is two 44px buttons rather than a drag, for the reason the
 * routine editor documents: a pointer drag is not a gesture a keyboard or a
 * screen reader has, and the accessible fallback IS these buttons.
 */
export function WorkoutExerciseCard({
  exercise,
  index,
  total,
  onAddSet,
  onEditSet,
  onMove,
  onRemove,
  isReordering,
}: {
  exercise: WorkoutExerciseRow;
  index: number;
  total: number;
  onAddSet: () => void;
  onEditSet: (set: WorkoutSetRow) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  isReordering: boolean;
}) {
  const t = useTranslations('dashboard.health.workout');
  const labels = useGymLabels();

  const EquipmentIcon = iconForCode(EQUIPMENT_ICON, exercise.equipment);

  return (
    <li className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums"
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-safe text-base font-semibold">
            {exercise.exerciseName}
          </p>
          <p className="break-safe flex items-center gap-1.5 text-xs text-muted-foreground">
            {labelForCode(labels.muscle, exercise.primaryMuscle)}
            <span aria-hidden>·</span>
            {EquipmentIcon ? (
              <EquipmentIcon aria-hidden className="size-3.5 shrink-0" />
            ) : null}
            {labelForCode(labels.equipment, exercise.equipment)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl"
            disabled={index === 0 || isReordering}
            aria-label={t('moveUpNamed', { name: exercise.exerciseName })}
            onClick={() => onMove(-1)}
          >
            <ChevronUp aria-hidden className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl"
            disabled={index === total - 1 || isReordering}
            aria-label={t('moveDownNamed', { name: exercise.exerciseName })}
            onClick={() => onMove(1)}
          >
            <ChevronDown aria-hidden className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl"
            aria-label={t('removeExerciseNamed', {
              name: exercise.exerciseName,
            })}
            onClick={onRemove}
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      {exercise.sets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noSets')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exercise.sets.map((set, setIndex) => (
            <li key={set.id}>
              <SetRow
                set={set}
                index={setIndex}
                metric={exercise.metric}
                onEdit={() => onEditSet(set)}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onAddSet}
        className="h-12 w-full rounded-2xl"
        aria-label={t('addSetNamed', { name: exercise.exerciseName })}
      >
        <Plus aria-hidden className="mr-2 size-4" />
        {t('addSet')}
      </Button>
    </li>
  );
}

function SetRow({
  set,
  index,
  metric,
  onEdit,
}: {
  set: WorkoutSetRow;
  index: number;
  metric: string;
  onEdit: () => void;
}) {
  const t = useTranslations('dashboard.health.workout');

  let summary: string;
  if (metric === 'time') {
    summary =
      set.durationSec === null
        ? t('setEmpty')
        : t('setTime', { seconds: set.durationSec });
  } else if (metric === 'bodyweight_reps') {
    summary =
      set.reps === null ? t('setEmpty') : t('setReps', { reps: set.reps });
  } else if (set.weightKg !== null && set.reps !== null) {
    summary =
      metric === 'weighted_bodyweight'
        ? t('setAddedReps', { weight: set.weightKg, reps: set.reps })
        : t('setWeightReps', { weight: set.weightKg, reps: set.reps });
  } else if (set.reps !== null) {
    summary = t('setReps', { reps: set.reps });
  } else {
    summary = t('setEmpty');
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${t('setNumber', { n: index + 1 })} — ${summary}`}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left',
        'transition-colors duration-200 hover:border-primary/40 hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
        {t('setNumber', { n: index + 1 })}
      </span>

      <span className="break-safe min-w-0 flex-1 text-sm font-medium tabular-nums">
        {summary}
      </span>

      {set.rpe !== null ? (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {t('setRpe', { value: set.rpe })}
        </span>
      ) : null}

      {/* Icon AND word: a flame alone would be the only mark separating a
          warm-up from a working set, and warm-ups are excluded from volume and
          from personal bests — too consequential to leave to a glyph. */}
      {set.isWarmup ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Flame aria-hidden className="size-3" />
          {t('warmupShort')}
        </span>
      ) : null}
    </button>
  );
}
