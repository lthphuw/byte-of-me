import { ChevronRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import type {
  ExerciseSessionReading,
  ExerciseSetReading,
} from '@/entities/gym-stats';
import { formatDayWithWeekday } from '@/features/gym/gym-charts';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/**
 * The last few sessions this exercise appeared in, set by set.
 *
 * **Warm-ups are shown and labelled**, where every statistic on the screen
 * above excludes them. The exclusion is a rule about the numbers, not about
 * the history: a warm-up that vanished from its own session's list would read
 * as a set that was never logged, and the whole point of `isWarmup` is that
 * the reader can see which sets counted.
 *
 * **An estimate above the reliable rep ceiling is rendered visibly
 * distinguished and never as a record.** It carries a `~` rather than a `≈`,
 * drops to muted text, and the note under the list says what the tilde means.
 * It is not hidden: dropping a twenty-rep back-off set would erase it from the
 * session it was actually performed in. It simply cannot be a record —
 * `personalRecords` enforces that independently of anything drawn here.
 *
 * A server component. Every branch is text, and the only interactive thing on
 * it is a link to the session itself.
 */
export async function ExerciseSessionList({
  sessions,
  metric,
  reliableMaxReps,
}: {
  sessions: ExerciseSessionReading[];
  metric: string;
  reliableMaxReps: number;
}) {
  const t = await getTranslations('dashboard.health.exerciseDetail');
  const tWorkout = await getTranslations('dashboard.health.workout');
  const locale = await getLocale();

  const anyUnreliable = sessions.some((session) =>
    session.sets.some((set) => set.e1rmUnreliable)
  );

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => (
        <article
          key={session.sessionId}
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-safe text-sm font-medium">{session.title}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatDayWithWeekday(session.localDate, locale)}
                {session.volumeLoadKg > 0
                  ? ` · ${t('sessionVolume', {
                      value: Math.round(session.volumeLoadKg),
                    })}`
                  : ''}
              </p>
            </div>

            <Link
              href={`/space/health/gym/${session.sessionId}`}
              aria-label={t('openSession', { title: session.title })}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>

          <ul className="flex flex-col gap-1.5">
            {session.sets.map((set, index) => (
              <li
                key={index}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm tabular-nums"
              >
                <span className="w-14 shrink-0 text-xs text-muted-foreground">
                  {tWorkout('setNumber', { n: index + 1 })}
                </span>

                <span className={cn(set.isWarmup && 'text-muted-foreground')}>
                  {setValue(set)}
                </span>

                {set.isWarmup ? (
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {tWorkout('warmupShort')}
                  </span>
                ) : null}

                {set.rpe !== null ? (
                  <span className="text-xs text-muted-foreground">
                    {tWorkout('setRpe', { value: set.rpe })}
                  </span>
                ) : null}

                {set.e1rmKg !== null ? (
                  <span
                    className={cn(
                      'text-xs',
                      set.e1rmUnreliable
                        ? 'text-muted-foreground'
                        : 'text-foreground/80'
                    )}
                  >
                    {set.e1rmUnreliable
                      ? t('setE1rmUnreliable', {
                          value: round(set.e1rmKg),
                        })
                      : t('setE1rm', { value: round(set.e1rmKg) })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
      ))}

      {anyUnreliable ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('unreliableSetNote', { reps: reliableMaxReps })}
        </p>
      ) : null}
    </div>
  );

  /** The set as the logging screen already prints it, so one exercise reads
   *  the same on both surfaces. The metric decides which of the five it is. */
  function setValue(set: ExerciseSetReading): string {
    if (metric === 'time') {
      return set.durationSec === null
        ? tWorkout('setEmpty')
        : tWorkout('setTime', { seconds: set.durationSec });
    }

    if (set.reps === null) return tWorkout('setEmpty');

    if (metric === 'bodyweight_reps') {
      return tWorkout('setReps', { reps: set.reps });
    }

    if (set.weightKg === null) {
      return tWorkout('setReps', { reps: set.reps });
    }

    return metric === 'weighted_bodyweight'
      ? tWorkout('setAddedReps', { weight: set.weightKg, reps: set.reps })
      : tWorkout('setWeightReps', { weight: set.weightKg, reps: set.reps });
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
