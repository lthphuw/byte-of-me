import { CalendarRange, Lightbulb, Scale, Sparkles } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import type { SleepInsights } from '@/entities/sleep-log';
import { minutesToClock, splitMinutes } from '@/shared/lib/health/duration';
import type {
  DurationBucket,
  DurationBucketId,
  FactorContrast,
  InsightOutcome,
  WeeklyObservation,
  WeeklyReview,
} from '@/shared/lib/health/sleep-insights';
import { MIN_NIGHTS_PER_SIDE } from '@/shared/lib/health/sleep-insights';

const HEADING_ID = 'sleep-insights-heading';

/** What the history supports and nothing more: no coefficient, no p-value, no
 *  trend line, no composite score — a contrast of the owner's own means with
 *  both n printed, and a bucketed mood curve, which is not monotonic. */
export async function SleepInsightsPanel({
  insights,
}: {
  insights: SleepInsights;
}) {
  const t = await getTranslations('dashboard.daily');
  const locale = await getLocale();

  const rating = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const points = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const dayFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const day = (key: string) => dayFormat.format(new Date(`${key}T00:00:00.000Z`));

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-3">
      <h2
        id={HEADING_ID}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <Lightbulb aria-hidden className="size-3.5 shrink-0" />
        {t('insights.heading')}
      </h2>

      <WeekCard
        week={insights.week}
        t={t}
        rating={rating}
        points={points}
        day={day}
      />

      <BucketCard buckets={insights.moodByDuration} t={t} rating={rating} />

      <FactorCard
        contrasts={insights.contrasts.contrasts}
        progress={insights.contrasts.progress}
        windowDays={insights.windowDays}
        t={t}
        rating={rating}
        points={points}
      />
    </section>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations<'dashboard.daily'>>>;

const CARD = 'flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow';

const BUCKET_LABEL = {
  lt6: 'insights.buckets.lt6',
  mid: 'insights.buckets.mid',
  gt7h30: 'insights.buckets.gt7h30',
} as const satisfies Record<DurationBucketId, string>;

const OUTCOME_LABEL = {
  restedness: 'insights.outcome.restedness',
  quality: 'insights.outcome.quality',
  mood: 'insights.outcome.mood',
} as const satisfies Record<InsightOutcome, string>;

const SUB_HEADING =
  'flex items-center gap-1.5 text-xs font-medium text-muted-foreground';

function WeekCard({
  week,
  t,
  rating,
  points,
  day,
}: {
  week: WeeklyReview;
  t: Translate;
  rating: Intl.NumberFormat;
  points: Intl.NumberFormat;
  day: (key: string) => string;
}) {
  const rows = [
    {
      key: 'duration',
      label: t('insights.week.duration'),
      value:
        week.recent.meanDurationMin === null
          ? null
          : t('units.hoursMinutes', splitMinutes(week.recent.meanDurationMin)),
      delta: minuteDelta(
        week.recent.meanDurationMin,
        week.previous.meanDurationMin,
        t,
        'insights.week.deltaMinutesUp',
        'insights.week.deltaMinutesDown'
      ),
    },
    {
      key: 'midsleep',
      label: t('insights.week.midsleep'),
      value:
        week.recent.meanMidsleepMin === null
          ? null
          : minutesToClock(week.recent.meanMidsleepMin),
      delta: minuteDelta(
        week.recent.meanMidsleepMin,
        week.previous.meanMidsleepMin,
        t,
        'insights.week.deltaLater',
        'insights.week.deltaEarlier'
      ),
    },
    {
      key: 'efficiency',
      label: t('insights.week.efficiency'),
      value:
        week.recent.meanEfficiencyPct === null
          ? null
          : `${Math.round(week.recent.meanEfficiencyPct)}%`,
      delta: pointDelta(
        week.recent.meanEfficiencyPct,
        week.previous.meanEfficiencyPct,
        t,
        points
      ),
    },
    {
      key: 'mood',
      label: t('insights.week.mood'),
      value:
        week.recent.meanMood === null
          ? null
          : t('insights.buckets.value', { value: rating.format(week.recent.meanMood) }),
      delta: pointDelta(week.recent.meanMood, week.previous.meanMood, t, points),
    },
  ];

  return (
    <div className={CARD}>
      <h3 className={SUB_HEADING}>
        <CalendarRange aria-hidden className="size-3.5 shrink-0" />
        {t('insights.week.heading')}
      </h3>

      {week.recent.nights === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('insights.week.empty')}
        </p>
      ) : (
        <>
          {/* Two columns down to 316px, matching the tile grids above it. */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {rows.map((row) => (
              <div key={row.key} className="flex min-w-0 flex-col gap-0.5">
                <dt className="break-safe text-xs text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="flex flex-col gap-0.5">
                  <span className="text-lg font-semibold tabular-nums leading-tight">
                    {row.value ?? '—'}
                  </span>
                  <span className="break-safe text-xs text-muted-foreground">
                    {row.value === null
                      ? t('insights.week.noValue')
                      : row.delta}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-xs text-muted-foreground">
            {t('insights.week.nights', { n: week.recent.nights })}
          </p>

          {week.best ? (
            <div className="flex flex-col gap-1 border-t pt-3">
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t('insights.week.best')}
                </span>{' '}
                <span className="tabular-nums">{day(week.best.localDate)}</span>
              </p>
              {week.worst ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {t('insights.week.worst')}
                  </span>{' '}
                  <span className="tabular-nums">
                    {day(week.worst.localDate)}
                  </span>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {week.rankedBy === 'restedness'
                  ? t('insights.week.byRestedness')
                  : t('insights.week.byDuration')}
              </p>
            </div>
          ) : null}

          {/* Exactly one observation, picked by the same effect-size ranking
              the contrasts use. */}
          <p className="flex items-start gap-2 border-t pt-3 text-sm">
            <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
            {observationText(week.observation, t, points)}
          </p>
        </>
      )}
    </div>
  );
}

function BucketCard({
  buckets,
  t,
  rating,
}: {
  buckets: DurationBucket[];
  t: Translate;
  rating: Intl.NumberFormat;
}) {
  return (
    <div className={CARD}>
      <h3 className={SUB_HEADING}>
        <Scale aria-hidden className="size-3.5 shrink-0" />
        {t('insights.buckets.heading')}
      </h3>

      <dl className="flex flex-col gap-3">
        {buckets.map((bucket) => (
          <div key={bucket.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <dt className="break-safe min-w-0 text-sm">
                {t(BUCKET_LABEL[bucket.id])}
              </dt>
              <dd className="text-sm tabular-nums">
                {bucket.meanMood === null
                  ? t('insights.buckets.empty')
                  : `${t('insights.buckets.value', {
                      value: rating.format(bucket.meanMood),
                    })} · ${t('insights.buckets.count', { n: bucket.n })}`}
              </dd>
            </div>
            {/* Redundant by design — the figure beside the label already says
                it, so a reader who cannot see the fill still reads the row. */}
            <div aria-hidden className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${((bucket.meanMood ?? 0) / 5) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </dl>

      <p className="text-xs text-muted-foreground">
        {t('insights.buckets.caveat')}
      </p>
    </div>
  );
}

function FactorCard({
  contrasts,
  progress,
  windowDays,
  t,
  rating,
  points,
}: {
  contrasts: FactorContrast[];
  progress: Array<{ factor: string; nightsNeeded: number }>;
  windowDays: number;
  t: Translate;
  rating: Intl.NumberFormat;
  points: Intl.NumberFormat;
}) {
  const label = (factor: string) => factorLabel(factor, t);

  return (
    <div className={CARD}>
      <h3 className={SUB_HEADING}>
        <Sparkles aria-hidden className="size-3.5 shrink-0" />
        {t('insights.factors.heading')}
      </h3>

      {contrasts.length === 0 && progress.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('insights.factors.none', { min: MIN_NIGHTS_PER_SIDE })}
        </p>
      ) : null}

      {contrasts.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {contrasts.map((c) => (
            <li key={c.factor} className="flex flex-col gap-1">
              <p className="text-sm">
                {t(
                  c.delta < 0
                    ? 'insights.factors.statementLower'
                    : 'insights.factors.statementHigher',
                  {
                    factor: label(c.factor),
                    outcome: t(OUTCOME_LABEL[c.outcome]),
                    delta: points.format(Math.abs(c.delta)),
                  }
                )}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {t('insights.factors.with', {
                  n: c.withN,
                  value: rating.format(c.withMean),
                })}
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {t('insights.factors.without', {
                  n: c.withoutN,
                  value: rating.format(c.withoutMean),
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Below the gate the reader gets a count of what is missing, never a
          blank row and never a number the nights cannot support. */}
      {progress.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t pt-3">
          {progress.map((p) => (
            <li key={p.factor} className="text-sm text-muted-foreground">
              {t('insights.factors.progress', {
                factor: label(p.factor),
                n: p.nightsNeeded,
              })}
            </li>
          ))}
        </ul>
      ) : null}

      {contrasts.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t('insights.factors.caveat', { days: windowDays })}
        </p>
      ) : null}
    </div>
  );
}

/** The six codes are the only values `SLEEP_FACTORS` holds, and each has a
 *  label in `dashboard.daily.factors.*` in both locales. */
function factorLabel(factor: string, t: Translate): string {
  switch (factor) {
    case 'caffeine_late':
      return t('factors.caffeine_late');
    case 'alcohol':
      return t('factors.alcohol');
    case 'screen_late':
      return t('factors.screen_late');
    case 'late_meal':
      return t('factors.late_meal');
    case 'workout_late':
      return t('factors.workout_late');
    default:
      return t('factors.ill');
  }
}

function minuteDelta(
  recent: number | null,
  previous: number | null,
  t: Translate,
  up: 'insights.week.deltaMinutesUp' | 'insights.week.deltaLater',
  down: 'insights.week.deltaMinutesDown' | 'insights.week.deltaEarlier'
): string {
  if (recent === null || previous === null) {
    return t('insights.week.noPrevious');
  }

  const delta = Math.round(recent - previous);
  if (delta === 0) return t('insights.week.deltaLevel');

  return t(delta > 0 ? up : down, { minutes: Math.abs(delta) });
}

function pointDelta(
  recent: number | null,
  previous: number | null,
  t: Translate,
  points: Intl.NumberFormat
): string {
  if (recent === null || previous === null) {
    return t('insights.week.noPrevious');
  }

  const delta = Math.round((recent - previous) * 10) / 10;
  if (delta === 0) return t('insights.week.deltaLevel');

  return t(
    delta > 0
      ? 'insights.week.deltaPointsUp'
      : 'insights.week.deltaPointsDown',
    { points: points.format(Math.abs(delta)) }
  );
}

function observationText(
  observation: WeeklyObservation | null,
  t: Translate,
  points: Intl.NumberFormat
): string {
  if (observation === null) return t('insights.week.obsNone');

  const up = observation.delta > 0;

  switch (observation.kind) {
    case 'duration':
      return t(
        up ? 'insights.week.obsDurationUp' : 'insights.week.obsDurationDown',
        { minutes: Math.round(Math.abs(observation.delta)) }
      );
    case 'midsleep':
      return t(
        up
          ? 'insights.week.obsMidsleepLater'
          : 'insights.week.obsMidsleepEarlier',
        { minutes: Math.round(Math.abs(observation.delta)) }
      );
    case 'efficiency':
      return t(
        up
          ? 'insights.week.obsEfficiencyUp'
          : 'insights.week.obsEfficiencyDown',
        { points: points.format(Math.abs(observation.delta)) }
      );
    default:
      return t(up ? 'insights.week.obsMoodUp' : 'insights.week.obsMoodDown', {
        points: points.format(Math.abs(observation.delta)),
      });
  }
}
