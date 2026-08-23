import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { AcwrCard } from './acwr-card';

import { getGymStats } from '@/entities/gym-stats';
import {
  E1rmChart,
  formatDay,
  MuscleSetsChart,
  OverloadTrend,
  WeeklyBarChart,
} from '@/features/gym/gym-charts';
import { Link } from '@/shared/i18n/navigation';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import type { ChartPoint } from '@/shared/ui/chart';

/**
 * The window every figure on this screen is taken over.
 *
 * Thirteen weeks: long enough that the weekly bars show a training block
 * rather than a fortnight, and a whole number of weeks so the oldest bucket is
 * not a stub. ACWR reads its own 7- and 28-day windows out of the same data
 * regardless, and the per-muscle counts read the last seven days — each
 * measure prints the window it used, because three windows on one screen is
 * exactly how a number gets read against the wrong one.
 */
const WINDOW_DAYS = 91;

/**
 * Gym statistics: what has been trained, how hard, and whether it is moving.
 *
 * A server component with no client fetching at all. Every figure is derived
 * from one read and none of it is interactive except the charts' own
 * selection, so there is no TanStack query here and therefore no key to drift
 * — the failure mode AGENTS §6 warns about cannot occur on a screen that never
 * prefetches. The charts are client leaves because `formatValue` is a function
 * prop and functions do not cross the boundary.
 *
 * **The read is awaited here and its failure renders IN PLACE.** `getGymStats`
 * returns an `ApiResponse` envelope rather than raising, because a throw
 * inside an RSC escapes to the root `error.tsx` and replaces the whole page —
 * the module header, the tabs and the way back to the gym along with it.
 *
 * Nothing on this screen shows a number without the thing it is measured
 * against, and nothing shows a blank where a measure refused to answer: every
 * null carries the sentence that says which threshold it fell short of and by
 * how much. That is the feature, not the polish.
 */
export async function GymStatsScreen() {
  const t = await getTranslations('dashboard.health.stats');
  const locale = await getLocale();
  const timeZone = await getRequestTimeZone();

  const result = await getGymStats({ days: WINDOW_DAYS, timeZone });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="flex flex-col gap-2">
            <Link
              href="/space/gym"
              className="inline-flex h-11 w-fit items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground underline underline-offset-4 transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft aria-hidden className="size-4 shrink-0" />
              {t('back')}
            </Link>

            <h2 className="text-xl font-semibold">{t('title')}</h2>

            {result.success ? (
              <p className="text-sm text-muted-foreground">
                {t('windowSummary', {
                  days: result.data.days,
                  sessions: result.data.finishedSessions,
                })}
              </p>
            ) : null}
          </div>

          {/* `destructive-text`, not `destructive`: §14 records that the fill
              token measures 3.76:1 as text. */}
          {!result.success ? (
            <p className="text-sm text-destructive-text">{result.errorMsg}</p>
          ) : result.data.finishedSessions === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('empty', { days: result.data.days })}
            </p>
          ) : (
            <>
              <AcwrCard acwr={result.data.acwr} />

              <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
                <WeeklyBarChart
                  points={result.data.weeks.map(
                    (week): ChartPoint => ({
                      label: t('weekEnding', {
                        day: formatDay(week.weekEnd, locale),
                      }),
                      value: week.volumeLoadKg,
                    })
                  )}
                  unit="kg"
                  title={t('volumeTitle')}
                  summary={t('volumeSummary')}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('volumeNote')}
                </p>
              </section>

              <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
                <WeeklyBarChart
                  points={result.data.weeks.map(
                    (week): ChartPoint => ({
                      label: t('weekEnding', {
                        day: formatDay(week.weekEnd, locale),
                      }),
                      // Null is a GAP, never a zero bar: a week whose sessions
                      // recorded no RPE has an unknown load, and a zero would
                      // read as a week of effortless training.
                      value: week.load,
                    })
                  )}
                  unit="load"
                  title={t('loadTitle')}
                  summary={t('loadSummary')}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('loadNote')}{' '}
                  {result.data.acwr.chronicKnown === 0 &&
                  result.data.acwr.chronicUnknown === 0
                    ? null
                    : unknownLoadCopy()}
                </p>
              </section>

              <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
                {result.data.hardSets.length === 0 ? (
                  <>
                    <h3 className="text-xs font-medium text-muted-foreground">
                      {t('musclesTitle', {
                        days: result.data.hardSetsWindowDays,
                      })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('musclesEmpty', {
                        days: result.data.hardSetsWindowDays,
                      })}
                    </p>
                  </>
                ) : (
                  <MuscleSetsChart
                    rows={result.data.hardSets}
                    bandLow={result.data.hypertrophyBandLow}
                    bandHigh={result.data.hypertrophyBandHigh}
                    secondaryCredit={result.data.secondaryCredit}
                    title={t('musclesTitle', {
                      days: result.data.hardSetsWindowDays,
                    })}
                    summary={t('musclesSummary', {
                      days: result.data.hardSetsWindowDays,
                    })}
                  />
                )}
              </section>

              <section className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold">
                  {t('progressionTitle')}
                </h3>

                {result.data.progressions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('progressionEmpty')}
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                    {result.data.progressions.map((progression) => (
                      <div
                        key={progression.exerciseId}
                        className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-safe text-sm font-medium">
                              {progression.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('sessionsLabel', {
                                n: progression.sessionCount,
                              })}
                            </p>
                          </div>

                          <Link
                            href={`/space/gym/exercises/${progression.exerciseId}`}
                            aria-label={t('openExercise', {
                              name: progression.name,
                            })}
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <ChevronRight aria-hidden className="size-4" />
                          </Link>
                        </div>

                        {progression.points.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {progression.unreliableOnlySessions > 0
                              ? t('unreliableOnly', {
                                  n: progression.unreliableOnlySessions,
                                  reps: result.data.e1rmReliableMaxReps,
                                })
                              : t('noEstimates')}
                          </p>
                        ) : (
                          <E1rmChart
                            points={progression.points.map((point) => ({
                              label: formatDay(point.localDate, locale),
                              valueKg: point.e1rmKg,
                              isRecord: point.isRecord,
                            }))}
                            title={t('e1rmChartTitle')}
                            summary={t('e1rmChartSummary', {
                              name: progression.name,
                            })}
                            unreliableNote={
                              progression.unreliableOnlySessions > 0
                                ? t('unreliableSkipped', {
                                    n: progression.unreliableOnlySessions,
                                    reps: result.data.e1rmReliableMaxReps,
                                  })
                                : undefined
                            }
                          />
                        )}

                        <OverloadTrend progression={progression} />
                      </div>
                    ))}
                  </div>
                )}

                {result.data.progressionTotal >
                result.data.progressions.length ? (
                  <p className="text-xs text-muted-foreground">
                    {t('progressionMore', {
                      n:
                        result.data.progressionTotal -
                        result.data.progressions.length,
                    })}
                  </p>
                ) : null}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /**
   * How much of the load chart is missing, and why.
   *
   * The 28-day window's counts are the ones ACWR is gated on, so they are the
   * ones a reader has just seen a null explained with; reporting a different
   * denominator here would look like a contradiction. Two sentences rather
   * than one: "none of them" is a different situation from "some of them".
   */
  function unknownLoadCopy(): string {
    if (!result.success) return '';

    const { chronicKnown, chronicUnknown, chronicDays } = result.data.acwr;

    if (chronicUnknown === 0) return '';

    return chronicKnown === 0
      ? t('loadNoneKnown', { days: chronicDays, n: chronicUnknown })
      : t('loadUnknown', {
          n: chronicUnknown,
          total: chronicKnown + chronicUnknown,
          days: chronicDays,
        });
  }
}
