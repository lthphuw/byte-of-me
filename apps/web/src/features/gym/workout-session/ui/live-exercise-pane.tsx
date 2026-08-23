'use client';

import { prefersReducedMotion } from '@byte-of-me/ui/lib/prefers-reduced-motion';
import { m } from 'framer-motion';
import { ChevronDown, CloudOff, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WorkoutExerciseRow, WorkoutSetRow } from '@/entities/workout';
import { isLocalSetId } from '@/features/gym/workout-session/lib/pending-set-store';
import { useSetSummary } from '@/features/gym/workout-session/model/use-set-summary';
import { labelForCode, useGymLabels } from '@/shared/hooks/use-gym-labels';
import { cn } from '@/shared/lib/utils';
import { EQUIPMENT_ICON, iconForCode } from '@/shared/ui/gym-icons';

/**
 * How far, or how fast, a drag has to go before it counts as a swipe.
 *
 * Both, not either-or: 60px catches a slow deliberate drag that never builds
 * speed, and 400px/s catches a quick flick that barely travels. A distance-only
 * test makes flicks feel dead; a velocity-only test fires on a scroll that
 * happened to start sideways.
 */
const SWIPE_DISTANCE_PX = 60;
const SWIPE_VELOCITY = 400;

/**
 * The exercise being worked on: which one it is, where it sits in the session,
 * and every set logged against it.
 *
 * **Horizontal swipe moves between exercises**, and the drag is scoped to this
 * card on purpose — it must not wrap the steppers below, where a hold that
 * drifts sideways is a repeat in progress, not a navigation. `dragDirectionLock`
 * settles the other half: a vertical scroll that starts with a few pixels of
 * horizontal wobble stays a scroll.
 *
 * The swipe is a shortcut, never the only way. Every destination it reaches is
 * also in the sheet behind the exercise name, because a drag is not a gesture a
 * keyboard or a screen reader has — the same reason the routine editor reorders
 * with buttons rather than a drag.
 *
 * `dragConstraints` pins both edges to zero and `dragElastic` gives the card a
 * little travel: the elastic is the affordance, and without it the first swipe
 * on a screen with no visible handles looks like nothing happened.
 *
 * **Position dots, not a scrollbar.** Five exercises is a shape a reader can
 * hold in their head; the dots say where in it they are and that there is more
 * to the side. They are `aria-hidden` and the same fact is announced in words
 * beside them, because a run of dots is not something a screen reader can
 * usefully describe.
 */
export function LiveExercisePane({
  exercise,
  index,
  total,
  onSwipe,
  onOpenSwitcher,
  onEditSet,
}: {
  exercise: WorkoutExerciseRow;
  index: number;
  total: number;
  /** `-1` for the previous exercise, `1` for the next. The caller clamps. */
  onSwipe: (delta: number) => void;
  onOpenSwitcher: () => void;
  onEditSet: (set: WorkoutSetRow) => void;
}) {
  const t = useTranslations('dashboard.health.workout');
  const tLive = useTranslations('dashboard.health.workout.live');
  const labels = useGymLabels();

  const EquipmentIcon = iconForCode(EQUIPMENT_ICON, exercise.equipment);

  return (
    <m.div
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={prefersReducedMotion() ? 0 : 0.14}
      dragMomentum={false}
      onDragEnd={(_event, info) => {
        const travelled = Math.abs(info.offset.x) > SWIPE_DISTANCE_PX;
        const flicked = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
        if (!travelled && !flicked) return;

        onSwipe(info.offset.x < 0 ? 1 : -1);
      }}
      className="flex touch-pan-y flex-col gap-4 rounded-3xl border bg-card p-5 shadow"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpenSwitcher}
          className={cn(
            'min-w-0 flex-1 rounded-2xl px-2 py-1 text-left',
            'transition-colors duration-200 hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className="break-safe min-w-0 text-xl font-semibold">
              {exercise.exerciseName}
            </span>
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </span>

          <span className="break-safe mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {labelForCode(labels.muscle, exercise.primaryMuscle)}
            <span aria-hidden>·</span>
            {EquipmentIcon ? (
              <EquipmentIcon aria-hidden className="size-3.5 shrink-0" />
            ) : null}
            {labelForCode(labels.equipment, exercise.equipment)}
          </span>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1 pt-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {tLive('exerciseOf', { index: index + 1, total })}
          </span>

          <span aria-hidden className="flex items-center gap-1">
            {Array.from({ length: total }).map((_, dot) => (
              <span
                key={dot}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  dot === index
                    ? 'w-4 bg-foreground'
                    : 'w-1.5 bg-muted-foreground/40'
                )}
              />
            ))}
          </span>
        </div>
      </div>

      {exercise.sets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noSets')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exercise.sets.map((set, setIndex) => (
            <li key={set.id}>
              <LiveSetRow
                set={set}
                index={setIndex}
                metric={exercise.metric}
                onEdit={() => onEditSet(set)}
              />
            </li>
          ))}
        </ul>
      )}
    </m.div>
  );
}

/**
 * One logged set. Tapping it opens the editor on that set — the numbers
 * themselves are the target, so the row stays a row of numbers instead of a row
 * of numbers with a pencil beside it, and the whole row is a 44px target rather
 * than a 44px button inside one.
 *
 * A set the server has not accepted yet carries a struck-through cloud AND the
 * row's ordinary content: the mark says "not sent", never "not logged". It is
 * an icon rather than a shade, because a shade at 0% saturation is
 * indistinguishable from a disabled row, and a disabled row is precisely the
 * wrong reading — the set happened, and tapping it still works.
 */
function LiveSetRow({
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
  const tLive = useTranslations('dashboard.health.workout.live');
  const summary = useSetSummary()(set, metric);
  const isUnsynced = isLocalSetId(set.id);

  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${t('setNumber', { n: index + 1 })} — ${summary}${
        isUnsynced ? ` — ${tLive('setUnsynced')}` : ''
      }`}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left',
        'transition-colors duration-200 hover:border-primary/40 hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
        {t('setNumber', { n: index + 1 })}
      </span>

      <span className="break-safe min-w-0 flex-1 text-base font-medium tabular-nums">
        {summary}
      </span>

      {set.rpe !== null ? (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {t('setRpe', { value: set.rpe })}
        </span>
      ) : null}

      {set.isWarmup ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Flame aria-hidden className="size-3" />
          {t('warmupShort')}
        </span>
      ) : null}

      {isUnsynced ? (
        <CloudOff
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      ) : null}
    </button>
  );
}
