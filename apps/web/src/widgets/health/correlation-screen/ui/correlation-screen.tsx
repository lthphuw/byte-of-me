import { Info } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import type {
  SleepTrainingCorrelation,
  SleepTrainingPoint,
} from '@/entities/health-insight';
import { getSleepTrainingCorrelation } from '@/entities/health-insight';
import {
  type ScatterPoint,
  SleepTrainingScatter,
} from '@/features/health/correlation-charts';
import { formatDay } from '@/features/health/gym-charts';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';

/**
 * The window the coefficients are taken over.
 *
 * Half a year. Twenty paired days is the floor every coefficient is gated on,
 * and a paired day needs a logged night AND a finished session — at three
 * sessions a week that is about seven weeks of unbroken logging, which nobody
 * achieves, so a 28-day window would answer "not enough data" forever. The
 * window is printed on the screen, because a ρ over six months and a ρ over
 * six weeks are different claims.
 */
const WINDOW_DAYS = 182;

/**
 * Does sleep predict training output?
 *
 * A server component with no client fetching: three coefficients and two
 * scatter plots, all derived from one read. The scatters are client leaves
 * because they hold selection state and own their `formatValue`.
 *
 * **The caveat block renders BEFORE any number, always, and never in a
 * tooltip.** This is one person's self-selected, unblinded, opportunistically
 * collected data. A coefficient from it is a question worth asking, and the
 * only thing standing between that and "sleeping more makes me lift more" is
 * the paragraph above it. Day of week is called out by name because it is the
 * confound that is guaranteed to be present: weekends are longer nights and
 * different sessions at the same time, and nothing here adjusts for it.
 *
 * **Nothing is drawn below the minimum paired days.** Each measure that cannot
 * answer says which count it fell short of — "7 of 20 paired days" — and the
 * three measures run over three different sets of days, so their counts are
 * derived separately from the same points rather than shared. Volume can
 * answer while RPE cannot, because a session logged without RPEs still has a
 * tonnage; a shared count would hide that.
 *
 * The read is awaited here and its failure renders IN PLACE. A throw inside an
 * RSC escapes to the root `error.tsx` and replaces the page.
 */
export async function CorrelationScreen() {
  const t = await getTranslations('dashboard.health.correlation');
  const locale = await getLocale();
  const timeZone = await getRequestTimeZone();

  const result = await getSleepTrainingCorrelation({
    days: WINDOW_DAYS,
    timeZone,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('windowSummary', { days: WINDOW_DAYS })}
            </p>
          </div>

          {/* Before any figure, not after it. A reader who meets the number
              first has already formed the causal reading the paragraph exists
              to prevent. */}
          <section className="flex flex-col gap-2 rounded-3xl border bg-card p-5 shadow">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Info aria-hidden className="size-4 shrink-0" />
              {t('caveatTitle')}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('caveat')}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('noPvalue')}
            </p>
          </section>

          {/* `destructive-text`, not `destructive`: §14 records that the fill
              token measures 3.76:1 as text. */}
          {!result.success ? (
            <p className="text-sm text-destructive-text">{result.errorMsg}</p>
          ) : result.data.points.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('empty', { days: WINDOW_DAYS })}
            </p>
          ) : (
            <Measures data={result.data} locale={locale} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The three measures, each with the count it is actually gated on.
 *
 * Split out so the screen above stays a layout and a caveat. The counts are
 * recomputed from `points` rather than taken from `pairedDays` for two of the
 * three: `pairedDays` counts days that trained, which is the denominator for
 * volume but not for RPE — a session where no working set recorded an RPE is a
 * paired day that the RPE measure cannot use.
 */
async function Measures({
  data,
  locale,
}: {
  data: SleepTrainingCorrelation;
  locale: string;
}) {
  const t = await getTranslations('dashboard.health.correlation');

  const volumeDays = data.points.filter(
    (point) => point.volumeLoadKg !== null
  ).length;
  const rpeDays = data.points.filter((point) => point.meanRpe !== null).length;
  const nightDays = data.points.length;

  const toScatter = (
    pick: (point: SleepTrainingPoint) => number | null
  ): ScatterPoint[] =>
    data.points.flatMap((point) => {
      const value = pick(point);
      if (value === null) return [];

      return [
        {
          key: point.localDate,
          label: formatDay(point.localDate, locale),
          sleepMin: point.totalSleepMin,
          value,
        },
      ];
    });

  return (
    <>
      {/* Why these counts do not add up to the training history elsewhere in
          the module. `sessionOnlyDays` is the line that answers it: a workout
          on an unlogged night has no predictor and enters nothing. */}
      <section className="flex flex-col gap-2 rounded-3xl border bg-card p-5 shadow">
        <h3 className="text-sm font-semibold">{t('accountingTitle')}</h3>
        <ul className="flex flex-col gap-1 text-sm tabular-nums text-muted-foreground">
          <li>{t('pairedDays', { n: data.pairedDays })}</li>
          <li>{t('sleepOnlyDays', { n: data.sleepOnlyDays })}</li>
          <li>{t('sessionOnlyDays', { n: data.sessionOnlyDays })}</li>
        </ul>
        <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
          {t('method')}
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
        <h3 className="text-sm font-semibold">{t('volumeTitle')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('volumeDescription')}
        </p>

        {data.volumeLoad === null ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {volumeDays < data.minPairs
              ? t('volumeNotEnough', {
                  n: volumeDays,
                  min: data.minPairs,
                })
              : t('volumeNoVariance', { n: volumeDays })}
          </p>
        ) : (
          <>
            <p className="text-2xl font-semibold tabular-nums">
              {t('rhoValue', { value: round(data.volumeLoad.rho) })}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {t('sampleSize', { n: data.volumeLoad.n })}
              </span>
            </p>

            <SleepTrainingScatter
              points={toScatter((point) => point.volumeLoadKg)}
              unit="kg"
              title={t('volumeChartTitle')}
              summary={t('volumeChartSummary')}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
        <h3 className="text-sm font-semibold">{t('rpeTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('rpeDescription')}</p>

        {data.meanRpe === null ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {rpeDays < data.minPairs
              ? t('rpeNotEnough', { n: rpeDays, min: data.minPairs })
              : t('rpeNoVariance', { n: rpeDays })}
          </p>
        ) : (
          <>
            <p className="text-2xl font-semibold tabular-nums">
              {t('rhoValue', { value: round(data.meanRpe.rho) })}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {t('sampleSize', { n: data.meanRpe.n })}
              </span>
            </p>

            <SleepTrainingScatter
              points={toScatter((point) => point.meanRpe)}
              unit="rpe"
              title={t('rpeChartTitle')}
              summary={t('rpeChartSummary')}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow">
        <h3 className="text-sm font-semibold">{t('trainedTitle')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('trainedDescription')}
        </p>

        {data.trained === null ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {nightDays < data.minPairs
              ? t('trainedNotEnough', { n: nightDays, min: data.minPairs })
              : t('trainedNoVariance', { n: nightDays })}
          </p>
        ) : (
          <p className="text-2xl font-semibold tabular-nums">
            {t('rhoValue', { value: round(data.trained.rho) })}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {t('trainedSample', { n: data.trained.n })}
            </span>
          </p>
        )}
      </section>
    </>
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
