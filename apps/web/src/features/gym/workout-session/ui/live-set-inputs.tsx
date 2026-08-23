'use client';

import { Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NumberStepper, type StepperBounds } from './number-stepper';

import type { SetDraft } from '@/features/gym/workout-session/lib/set-drafts';
import {
  DURATION_STEP_SEC,
  REPS_STEP,
  RPE_STEP,
  weightStepKg,
} from '@/features/gym/workout-session/lib/set-increments';
import { cn } from '@/shared/lib/utils';

/** The bounds each measure's schema enforces, restated here so a stepper
 *  cannot produce a value the action would reject. `workoutSetAddSchema` is
 *  the authority; these are the same numbers, clamped early enough to be a
 *  disabled press rather than a failed save. */
const WEIGHT_BOUNDS: StepperBounds = { min: 0, max: 9999.99 };
const REPS_BOUNDS: StepperBounds = { min: 0, max: 1000 };
const DURATION_BOUNDS: StepperBounds = { min: 0, max: 86_400 };
const RPE_BOUNDS: StepperBounds = { min: 0, max: 10 };

/** Which measure the numpad was opened on. */
export type SetField = 'weightKg' | 'reps' | 'durationSec' | 'rpe';

/**
 * The set about to be logged.
 *
 * **Which measures appear is decided by the exercise's METRIC**, the same rule
 * the post-workout set editor follows and the reason `WorkoutExerciseRow`
 * carries the catalogue's `metric` at all: a plank has no reps and a pull-up no
 * external load, so one reps-and-weight pair would ask two of the four kinds of
 * exercise for numbers that do not exist.
 *
 * **These fields open pre-filled with the last set's numbers**, which is what
 * makes the common case one tap. The observation the screen is built on is that
 * set N+1 is almost always identical to set N — five sets of the same weight
 * and reps is the ordinary case, not the exception — so the fastest correct
 * default is the set before it, and everything here is the exception path.
 *
 * The warm-up toggle is last and INVERTS when on, with the word beside the
 * flame rather than the flame alone: the flag excludes the set from volume,
 * from personal bests and from the per-muscle count, which is too consequential
 * to leave to a glyph on a palette with no hue (§14).
 */
export function LiveSetInputs({
  draft,
  metric,
  equipment,
  onChange,
  onOpenNumpad,
}: {
  draft: SetDraft;
  metric: string;
  /** Decides the weight step: a barbell moves in 2.5 kg, a dumbbell rack in
   *  whole kilos (`set-increments.ts`). */
  equipment: string;
  onChange: (draft: SetDraft) => void;
  onOpenNumpad: (field: SetField) => void;
}) {
  const t = useTranslations('dashboard.health.workout');
  const tUnits = useTranslations('dashboard.health.workout.live');

  const showWeight =
    metric === 'weight_reps' || metric === 'weighted_bodyweight';
  const showReps = metric !== 'time';
  const showDuration = metric === 'time';

  return (
    <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow">
      {showWeight ? (
        <NumberStepper
          label={
            metric === 'weighted_bodyweight' ? t('addedWeight') : t('weight')
          }
          unit={tUnits('unitKg')}
          value={draft.weightKg}
          step={weightStepKg(equipment)}
          bounds={WEIGHT_BOUNDS}
          onChange={(weightKg) => onChange({ ...draft, weightKg })}
          onOpenNumpad={() => onOpenNumpad('weightKg')}
        />
      ) : null}

      {showReps ? (
        <NumberStepper
          label={t('reps')}
          unit={tUnits('unitReps')}
          value={draft.reps}
          step={REPS_STEP}
          bounds={REPS_BOUNDS}
          onChange={(reps) => onChange({ ...draft, reps })}
          onOpenNumpad={() => onOpenNumpad('reps')}
        />
      ) : null}

      {showDuration ? (
        <NumberStepper
          label={t('durationSec')}
          unit={tUnits('unitSeconds')}
          value={draft.durationSec}
          step={DURATION_STEP_SEC}
          bounds={DURATION_BOUNDS}
          onChange={(durationSec) => onChange({ ...draft, durationSec })}
          onOpenNumpad={() => onOpenNumpad('durationSec')}
        />
      ) : null}

      <NumberStepper
        label={t('rpe')}
        unit={tUnits('unitRpe')}
        value={draft.rpe}
        step={RPE_STEP}
        bounds={RPE_BOUNDS}
        onChange={(rpe) => onChange({ ...draft, rpe })}
        onOpenNumpad={() => onOpenNumpad('rpe')}
      />

      <button
        type="button"
        aria-pressed={draft.isWarmup}
        onClick={() => onChange({ ...draft, isWarmup: !draft.isWarmup })}
        className={cn(
          'flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-4',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          draft.isWarmup
            ? 'border-primary bg-primary font-semibold text-primary-foreground'
            : 'bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground'
        )}
      >
        <Flame aria-hidden className="size-4 shrink-0" />
        <span className="text-sm">{t('warmup')}</span>
      </button>
    </div>
  );
}
