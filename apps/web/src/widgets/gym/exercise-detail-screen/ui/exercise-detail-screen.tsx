import { ArrowLeft, Medal, TrendingUp } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { ExerciseIdentity, MetricNotApplicable } from './exercise-identity';
import { ExerciseSessionList } from './exercise-session-list';

import { getExerciseProgress } from '@/entities/gym-stats';
import {
  E1rmChart,
  formatDay,
  formatDayWithWeekday,
  OverloadTrend,
} from '@/features/gym/gym-charts';
import { Link } from '@/shared/i18n/navigation';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { StatTile } from '@/shared/ui/stat-tile';

/**
 * How far back one exercise's own history is read.
 *
 * A year, the widest the schema allows, because a per-exercise record is the
 * one figure on this module a lifter reads as "my best". It is still BOUNDED,
 * like every read here, and the screen says the window out loud rather than
 * letting a twelve-month best pass as a lifetime one.
 */
const WINDOW_DAYS = 365;

/**
 * One exercise: how the estimate has moved, what the records are, and the sets
 * behind them.
 *
 * A server component with no client fetching. The read is awaited here and its
 * failure — including "no such exercise" — renders IN PLACE: a throw inside an
 * RSC escapes to the root `error.tsx` and replaces the whole page rather than
 * this screen's own message, which is why `getExerciseProgress` returns
 * `{ success: true, data: null }` for a miss instead of raising.
 *
 * Three separate reasons the chart can be empty, and each gets its own
 * sentence rather than a shared blank: the metric has no e1RM at all, the
 * exercise was not trained in the window, or it was trained but every working
 * set was above the reliable rep ceiling. The third is the one a bare empty
 * state gets wrong — it reads as "you did not train this", which is false.
 */
export async function ExerciseDetailScreen({
  exerciseId,
}: {
  exerciseId: string;
}) {
  const t = await getTranslations('dashboard.health.exerciseDetail');
  const locale = await getLocale();
  const timeZone = await getRequestTimeZone();

  const result = await getExerciseProgress({
    exerciseId,
    days: WINDOW_DAYS,
    timeZone,
  });

  const exercise = result.success ? result.data : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <Link
            href="/space/gym/exercises"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground underline underline-offset-4 transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft aria-hidden className="size-4 shrink-0" />
            {t('back')}
          </Link>

          {/* `destructive-text`, not `destructive`: §14 records that the fill
              token measures 3.76:1 as text. */}
          {!result.success ? (
            <p className="text-sm text-destructive-text">{result.errorMsg}</p>
          ) : exercise === null ? (
            <p className="text-sm text-muted-foreground">{t('notFound')}</p>
          ) : (
            <>
              <ExerciseIdentity exercise={exercise} />

              <p className="text-sm text-muted-foreground">
                {t('windowSummary', {
                  days: exercise.days,
                  sessions: exercise.progression.sessionCount,
                })}
              </p>

              <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
                <h3 className="text-sm font-semibold">{t('chartTitle')}</h3>

                {exercise.metric !== 'weight_reps' ? (
                  <MetricNotApplicable metric={exercise.metric} />
                ) : exercise.progression.sessionCount === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('neverTrained', { days: exercise.days })}
                  </p>
                ) : exercise.progression.points.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {exercise.progression.unreliableOnlySessions > 0
                      ? t('everySetUnreliable', {
                          n: exercise.progression.sessionCount,
                          reps: exercise.e1rmReliableMaxReps,
                        })
                      : t('noEstimates')}
                  </p>
                ) : (
                  <>
                    <E1rmChart
                      points={exercise.progression.points.map((point) => ({
                        label: formatDay(point.localDate, locale),
                        valueKg: point.e1rmKg,
                        isRecord: point.isRecord,
                      }))}
                      title={t('chartTitle')}
                      summary={t('chartSummary')}
                      unreliableNote={
                        exercise.progression.unreliableOnlySessions > 0
                          ? t('unreliableSkipped', {
                              n: exercise.progression.unreliableOnlySessions,
                              reps: exercise.e1rmReliableMaxReps,
                            })
                          : undefined
                      }
                    />

                    <OverloadTrend progression={exercise.progression} />
                  </>
                )}
              </section>

              {exercise.metric === 'weight_reps' ? (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">
                    {t('recordsTitle', { days: exercise.days })}
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatTile
                      icon={Medal}
                      label={t('heaviest')}
                      value={
                        exercise.heaviest === null
                          ? '—'
                          : t('heaviestValue', {
                              weight: exercise.heaviest.weightKg,
                              reps: exercise.heaviest.reps,
                            })
                      }
                      context={
                        exercise.heaviest === null ? undefined : (
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {formatDayWithWeekday(
                              exercise.heaviest.localDate,
                              locale
                            )}
                          </p>
                        )
                      }
                      hint={
                        exercise.heaviest === null
                          ? t('heaviestNone', { days: exercise.days })
                          : undefined
                      }
                    />

                    <StatTile
                      icon={TrendingUp}
                      label={t('bestE1rm')}
                      value={
                        exercise.bestE1rm === null
                          ? '—'
                          : t('kgValue', {
                              value:
                                Math.round(exercise.bestE1rm.valueKg * 10) / 10,
                            })
                      }
                      context={
                        exercise.bestE1rm === null ? undefined : (
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {t('bestE1rmContext', {
                              weight: exercise.bestE1rm.weightKg,
                              reps: exercise.bestE1rm.reps,
                              day: formatDayWithWeekday(
                                exercise.bestE1rm.localDate,
                                locale
                              ),
                            })}
                          </p>
                        )
                      }
                      hint={
                        exercise.bestE1rm === null
                          ? t('bestE1rmNone', { days: exercise.days })
                          : undefined
                      }
                    />
                  </div>

                  {/* The window is stated, not implied. A "best" with no span
                      beside it is read as a lifetime figure, and this read is
                      bounded so that it cannot scan the whole history. */}
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t('recordsWindowNote', { days: exercise.days })}
                  </p>
                </section>
              ) : null}

              {exercise.sessions.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">
                    {t('sessionsTitle')}
                  </h3>

                  <ExerciseSessionList
                    sessions={exercise.sessions}
                    metric={exercise.metric}
                    reliableMaxReps={exercise.e1rmReliableMaxReps}
                  />

                  {exercise.progression.sessionCount >
                  exercise.sessions.length ? (
                    <p className="text-xs text-muted-foreground">
                      {t('sessionsCap', { n: exercise.sessions.length })}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
