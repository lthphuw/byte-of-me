'use client';

import { Button } from '@byte-of-me/ui';
import { Check, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WorkoutExerciseRow } from '@/entities/workout';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { cn } from '@/shared/lib/utils';
import { ResponsiveModal } from '@/shared/ui/responsive-modal';

/**
 * The whole routine, one tap away from anywhere in it.
 *
 * Swiping between exercises is the fast path and a bad way to travel: it takes
 * four gestures to reach the fifth exercise and gives no answer to "what is
 * left". This sheet is the map — every exercise, in performing order, with how
 * many sets are on each — and it opens from the exercise NAME, the thing the
 * reader is already looking at when they want to know where they are.
 *
 * **The set count is the only progress indicator this screen has**, and it is
 * printed as a number rather than drawn as a bar, because a bar needs a target
 * to be a fraction of and a session does not have to follow the routine that
 * started it — sets get added, exercises get skipped, and a progress bar that
 * says 120% is a bar that has stopped meaning anything.
 *
 * The current exercise INVERTS (§14) and carries `aria-current`, the same pair
 * of cues the notes view switch uses, because a tint at 0% saturation is not a
 * state.
 */
export function ExerciseSwitchSheet({
  open,
  onOpenChange,
  exercises,
  activeIndex,
  onSelect,
  onAddExercise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: WorkoutExerciseRow[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAddExercise: () => void;
}) {
  const t = useTranslations('dashboard.gym.workout');
  const tGym = useTranslations('dashboard.gym.gym');
  const tLive = useTranslations('dashboard.gym.workout.live');
  const labels = useGymLabels();

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={tLive('switchExercise')}
      description={tLive('switchExerciseHint')}
      footer={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onOpenChange(false);
            onAddExercise();
          }}
          className="h-14 w-full rounded-2xl"
        >
          <Plus aria-hidden className="mr-2 size-4" />
          {t('addExercise')}
        </Button>
      }
    >
      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noExercises')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exercises.map((exercise, index) => {
            const isActive = index === activeIndex;

            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => {
                    onSelect(index);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-2 text-left',
                    'transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:border-primary/40 hover:bg-muted'
                  )}
                >
                  <span className="w-5 shrink-0 text-xs tabular-nums opacity-70">
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="break-safe block text-sm font-medium">
                      {exercise.exerciseName}
                    </span>
                    <span
                      className={cn(
                        'break-safe block text-xs',
                        isActive ? 'opacity-80' : 'text-muted-foreground'
                      )}
                    >
                      {labelForCode(labels.muscle, exercise.primaryMuscle)}
                    </span>
                  </span>

                  {/* Icon AND count: the tick alone would be the only mark
                      separating "done something" from "not started", and a
                      glyph at 0% saturation on an inverted row is not enough
                      to carry it. */}
                  <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums">
                    {exercise.sets.length > 0 ? (
                      <Check aria-hidden className="size-3.5" />
                    ) : null}
                    {tGym('setCount', { n: exercise.sets.length })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveModal>
  );
}
