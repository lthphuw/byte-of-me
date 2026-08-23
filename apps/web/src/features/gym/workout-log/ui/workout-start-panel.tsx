'use client';

import { useState } from 'react';
import { Button, buttonVariants, Input, Label } from '@byte-of-me/ui';
import { CircleDot, Play } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useRoutines } from '@/features/gym/routine-editor';
import {
  useOpenWorkout,
  useStartWorkout,
} from '@/features/gym/workout-log/model/use-open-workout';
import { Link } from '@/shared/i18n/navigation';
import { formatClock } from '@/shared/lib/local-date-format';
import { cn } from '@/shared/lib/utils';
import { OptionTileGrid } from '@/shared/ui/option-tile-grid';

/** The value the "no routine" tile carries. Empty string rather than null so
 *  the tile grid, which speaks in strings, needs no special case. */
const NO_ROUTINE = '';

/**
 * The one control the gym screen opens with — and it has two shapes, decided
 * by whether a workout is already running.
 *
 * **A session already open is a STATE, not an error.** The server refuses to
 * open a second one: `WorkoutSession` has no status column, `endedAt IS NULL`
 * is the whole definition of "in progress", and
 * `idx_workout_sessions_owner_open` exists on the assumption that it matches
 * at most one row — two would make `getOpenWorkoutSession` pick one
 * arbitrarily and silently log sets into it. Surfacing that refusal as a toast
 * would put the reader in front of a Start button that is never going to work.
 * So when `useOpenWorkout` returns a session, this panel becomes a card
 * describing it — its name, when it started, how much is in it — and the
 * primary action reads **Resume** and goes to it. The routine chooser is gone,
 * not disabled: there is nothing to choose.
 *
 * The same holds if the refusal arrives anyway, from a session opened in
 * another tab: `useStartWorkout` refetches the open session on error, this
 * query resolves, and the panel redraws itself into the Resume form. The toast
 * is the explanation, never the remedy.
 *
 * **Starting.** One tile grid: every live routine, plus "no routine". Picking
 * a routine seeds the session with its exercises in order and snapshots its
 * name as the session title. Picking "no routine" reveals a name field, which
 * is required only in that branch — `workoutStartSchema` refuses a session
 * with neither a routine nor a title, and pre-filling it from the catalogue
 * means the common case is still one tap after the tile.
 */
export function WorkoutStartPanel({ timeZone }: { timeZone: string }) {
  const t = useTranslations('dashboard.health.gym');
  const tError = useTranslations('dashboard.health.errors');
  const locale = useLocale();

  const openQuery = useOpenWorkout();
  const routinesQuery = useRoutines(false);
  const start = useStartWorkout();

  const [routineId, setRoutineId] = useState<string>(NO_ROUTINE);
  const [title, setTitle] = useState(t('defaultTitle'));

  const openResult = openQuery.data;
  const openSession = openResult?.success ? openResult.data : null;
  const openError = openQuery.isError
    ? tError('load')
    : openResult && !openResult.success
    ? openResult.errorMsg
    : null;

  const routinesResult = routinesQuery.data;
  const routines = routinesResult?.success ? routinesResult.data : [];

  if (openError) {
    /* `destructive-text`, not `destructive`: §14 records that the fill token
       measures 3.76:1 as text. */
    return (
      <section className="rounded-3xl border bg-card p-5 shadow">
        <p className="text-sm text-destructive-text">{openError}</p>
      </section>
    );
  }

  if (openQuery.isPending) {
    return (
      <section
        className="rounded-3xl border bg-card p-5 shadow"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </section>
    );
  }

  if (openSession) {
    const setCount = openSession.exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0
    );

    return (
      <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow">
        <div className="space-y-2">
          {/* The badge carries a dot AND the words — an icon beside a label,
              never a coloured dot alone, because there is no hue on this
              palette to make one mean "live". */}
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CircleDot aria-hidden className="size-3.5 shrink-0" />
            {t('inProgress')}
          </p>

          <p className="break-safe text-2xl font-semibold">
            {openSession.title}
          </p>

          <p className="text-sm tabular-nums text-muted-foreground">
            {t('startedAt', {
              time: formatClock(openSession.startedAt, locale, timeZone),
            })}
          </p>

          <p className="text-sm tabular-nums text-muted-foreground">
            {t('exerciseCount', { n: openSession.exercises.length })} ·{' '}
            {t('setCount', { n: setCount })}
          </p>
        </div>

        <Link
          href={`/space/health/gym/${openSession.id}`}
          className={cn(buttonVariants(), 'h-14 w-full rounded-2xl text-base')}
        >
          <Play aria-hidden className="mr-2 size-5" />
          {t('resume')}
        </Link>

        <p className="text-xs text-muted-foreground">{t('inProgressHint')}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">{t('start')}</h2>
        <p className="text-sm text-muted-foreground">{t('chooseRoutine')}</p>
      </div>

      {routines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noRoutines')}</p>
      ) : null}

      <OptionTileGrid
        ariaLabel={t('routineAriaLabel')}
        columns="grid-cols-2 sm:grid-cols-3"
        options={[
          { value: NO_ROUTINE, label: t('emptySession') },
          ...routines.map((routine) => ({
            value: routine.id,
            label: routine.name,
          })),
        ]}
        selected={[routineId]}
        // Single-select and never clearable: "no routine" is itself one of the
        // tiles, so there is no unanswered state to return to.
        onToggle={setRoutineId}
      />

      {routineId === NO_ROUTINE ? (
        <div className="space-y-2">
          <Label htmlFor="workout-title">{t('sessionName')}</Label>
          <Input
            id="workout-title"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            className="h-14 rounded-2xl bg-background text-base transition-colors duration-200 hover:border-primary/40"
          />
          <p className="text-xs text-muted-foreground">
            {t('emptySessionHint')}
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        disabled={
          start.isPending || (routineId === NO_ROUTINE && title.trim() === '')
        }
        onClick={() =>
          start.mutate({
            routineId: routineId === NO_ROUTINE ? null : routineId,
            title,
          })
        }
        className="h-14 w-full rounded-2xl text-base"
      >
        <Play aria-hidden className="mr-2 size-5" />
        {start.isPending ? t('starting') : t('startAction')}
      </Button>
    </section>
  );
}
