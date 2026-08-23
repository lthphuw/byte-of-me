'use client';

import { Dumbbell, Layers, Timer, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WorkoutSessionDetail } from '@/entities/workout';
import { elapsedMinutes } from '@/features/gym/workout-session/lib/live-clock';
import { summariseSession } from '@/features/gym/workout-session/lib/session-summary';
import { splitMinutes } from '@/shared/lib/health/duration';
import { StatTile } from '@/shared/ui/stat-tile';

/**
 * What the session came to, above the rating that closes it.
 *
 * It is here because the RPE question ("how hard was that?") is easier to
 * answer with the workout in front of you than from memory thirty seconds
 * after the last set — and because a summary is the one moment the numbers
 * this module collects pay the reader back for collecting them.
 *
 * Every figure is computed from the session already in hand, with no second
 * read: this opens on the gym floor at the end of a workout, and a summary
 * that fetches before it can print shows a spinner at the one moment nobody
 * will wait.
 *
 * **"Top set" is not "personal record", and the wording is deliberate.** A
 * record is a claim about the whole history, and the history read this slice
 * has returns sessions without their sets — so a PR line here would either be
 * invented or would report the first set of every new exercise as a record.
 * The heaviest working set of the session is a true statement, and it is the
 * one this screen can make.
 */
export function FinishSummary({
  session,
  now,
}: {
  session: WorkoutSessionDetail;
  /** The clock at the moment the sheet opened, passed in rather than read
   *  here so the duration does not tick while the reader is choosing an RPE. */
  now: number;
}) {
  const t = useTranslations('dashboard.gym.workout.live');
  const tGym = useTranslations('dashboard.gym.gym');
  const tUnits = useTranslations('dashboard.gym.units');

  const summary = summariseSession(session);
  const durationMin = elapsedMinutes(session.startedAt, now);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={Timer}
          label={tGym('duration')}
          value={tUnits('hoursMinutes', splitMinutes(durationMin))}
        />

        <StatTile
          icon={Layers}
          label={t('workingSets')}
          value={summary.workingSetCount}
          // The two counts differ whenever a warm-up was logged, and a reader
          // looking at "12" while remembering fifteen sets deserves the reason
          // rather than a discrepancy.
          hint={
            summary.totalSetCount === summary.workingSetCount
              ? undefined
              : t('totalSets', { n: summary.totalSetCount })
          }
        />

        <StatTile
          icon={Dumbbell}
          label={t('volume')}
          value={
            summary.volume.loadKg > 0
              ? t('volumeKg', { kg: Math.round(summary.volume.loadKg) })
              : '—'
          }
          hint={
            summary.volume.addedLoadKg > 0
              ? t('addedVolumeKg', {
                  kg: Math.round(summary.volume.addedLoadKg),
                })
              : undefined
          }
        />
      </div>

      {summary.bestSets.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <TrendingUp aria-hidden className="size-4 shrink-0" />
            {t('topSets')}
          </p>

          <ul className="flex flex-col gap-1.5">
            {summary.bestSets.map((best) => (
              <li
                key={best.workoutExerciseId}
                className="flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2"
              >
                <span className="break-safe min-w-0 flex-1 text-sm">
                  {best.exerciseName}
                </span>

                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {t('topSetValue', {
                    weight: best.weightKg,
                    reps: best.reps,
                  })}
                </span>

                {best.e1rmKg !== null ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {t('e1rm', { kg: Math.round(best.e1rmKg) })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
