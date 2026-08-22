import { getTranslations } from 'next-intl/server';

import {
  getSleepLogs,
  getSleepSummary,
  type SleepLogRow,
} from '@/entities/sleep-log';
import {
  type DayValue,
  SleepConsistencyHeatmap,
  SleepDurationChart,
  startOfWeek,
} from '@/features/health/sleep-charts';
import {
  localClockMinutes,
  medianBedClock,
  type SleepEntryDefaults,
  SleepEntryForm,
} from '@/features/health/sleep-entry';
import { minutesToClock, splitMinutes } from '@/shared/lib/health/duration';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { computeNight } from '@/shared/lib/health/sleep-stats';
import { StatTile } from '@/shared/ui/stat-tile';

/** Both the bar chart's window and the window `getSleepSummary` computes the
 *  rolling debt over — they are the same number by design, not by coincidence,
 *  which is why the caveat string can say "14-day" out loud. */
const WINDOW_DAYS = 14;

/** Columns in the consistency grid. Thirteen weeks is a quarter, and at 17px a
 *  column it is 221px wide — narrower than a phone, so the heatmap never needs
 *  to scroll to be read whole. */
const HEATMAP_WEEKS = 13;

/** Bedtimes older than the summary window say nothing about what the form
 *  should open at. */
const MEDIAN_SAMPLE_DAYS = 14;

const FALLBACK_BED_CLOCK = '23:00';

/**
 * Log a night, then look at the fortnight it belongs to.
 *
 * A server component that renders a client form: the entry surface is the
 * interactive part and everything below it is derived numbers, so only the
 * form and the two charts cross into the browser. The stats and the history
 * arrive as `children` of the form because the form owns the page's scroll
 * area — the save bar has to sit outside it to stay under a thumb while the
 * charts scroll past.
 *
 * Two reads, deliberately. The summary is the statistics over the debt window
 * and cannot be widened without changing what "sleep debt" means; the log
 * range is three months, which is what a consistency grid needs to be worth
 * drawing, and is also where the form's own defaults come from — today's row
 * if there is one, and the median bedtime if there is not.
 *
 * Neither failure throws. Both are awaited by an RSC, where a throw replaces
 * the whole page with the root `error.tsx` — including the form, which does
 * not need either read to work.
 */
export async function SleepScreen() {
  const t = await getTranslations('dashboard.health');
  const timeZone = await getRequestTimeZone();

  const today = toLocalDate(new Date(), timeZone);
  const todayKey = localDateKey(today);
  const chartStartKey = localDateKey(addDays(today, -(WINDOW_DAYS - 1)));
  // Aligned to a week start, because `CalendarHeatmap` fills seven rows per
  // column: a series beginning mid-week turns every column into a rolling
  // seven days rather than a calendar one. The read starts on the same day, so
  // no cell can claim a night was missed when it was merely outside the query.
  const heatmapStart = addDays(startOfWeek(today), -(HEATMAP_WEEKS - 1) * 7);

  const [summaryRes, logsRes] = await Promise.all([
    getSleepSummary({ days: WINDOW_DAYS, timeZone }),
    getSleepLogs({ from: localDateKey(heatmapStart), to: todayKey }),
  ]);

  const summary = summaryRes.success ? summaryRes.data : null;
  const rows = logsRes.success ? logsRes.data : [];
  const failed = !summaryRes.success || !logsRes.success;

  const series: DayValue[] = rows.map(toDayValue);
  const defaults = buildDefaults(rows, todayKey, today, timeZone);

  const efficiency = summary?.nights.at(-1)?.efficiencyPct ?? null;

  return (
    <SleepEntryForm defaults={defaults}>
      <section
        aria-label={t('sleep.statsAriaLabel')}
        className="flex flex-col gap-6 border-t pt-6"
      >
        {failed ? (
          <p className="text-sm text-destructive">{t('errors.load')}</p>
        ) : null}

        {summary ? (
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label={t('sleep.efficiency')}
              value={efficiency === null ? '—' : `${Math.round(efficiency)}%`}
              hint={
                efficiency === null
                  ? t('sleep.efficiencyUnavailable')
                  : undefined
              }
            />
            <StatTile
              label={t('sleep.debt')}
              value={t('units.hoursMinutes', splitMinutes(summary.debtMin))}
              hint={t('sleep.debtCaveat')}
            />
            <StatTile label={t('sleep.streak')} value={summary.streak} />
            <StatTile
              label={t('sleep.bedtimeSd')}
              value={
                summary.bedtimeSdMin === null
                  ? '—'
                  : `± ${t('units.minutes', {
                      minutes: Math.round(summary.bedtimeSdMin),
                    })}`
              }
            />
            <StatTile
              label={t('sleep.waketimeSd')}
              value={
                summary.waketimeSdMin === null
                  ? '—'
                  : `± ${t('units.minutes', {
                      minutes: Math.round(summary.waketimeSdMin),
                    })}`
              }
              className="col-span-2"
            />
          </div>
        ) : null}

        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('sleep.noHistory')}
          </p>
        ) : (
          <>
            <SleepDurationChart
              nights={series}
              startKey={chartStartKey}
              days={WINDOW_DAYS}
              targetMin={summary?.targetMin}
            />
            <SleepConsistencyHeatmap
              nights={series}
              startKey={localDateKey(heatmapStart)}
              days={HEATMAP_WEEKS * 7}
            />
          </>
        )}
      </section>
    </SleepEntryForm>
  );
}

/**
 * `computeNight` rather than `wakeAt - bedAt`, so the grid is shaded by time
 * ASLEEP — latency and recorded awakenings taken off — exactly like every
 * other duration in this module. Re-deriving it here would be a second
 * definition of the one number the whole screen is about.
 */
function toDayValue(row: SleepLogRow): DayValue {
  const night = computeNight({
    localDate: new Date(`${row.localDate}T00:00:00.000Z`),
    bedAt: new Date(row.bedAt),
    wakeAt: new Date(row.wakeAt),
    latencyMin: row.latencyMin,
    awakeningsMin: row.awakeningsMin,
  });

  return { localDate: row.localDate, value: night.totalSleepMin };
}

/**
 * What the form opens showing.
 *
 * Today's row wins outright when there is one: the write is an upsert, so
 * opening the screen a second time is an EDIT, and a form that came up blank
 * would quietly offer to overwrite a saved night with its own defaults.
 *
 * Otherwise: wake time is now, rounded to five minutes, and bedtime is the
 * median of the last fortnight. Both are resolved here rather than in the
 * browser so that the server's markup and the first client render agree — a
 * clock computed in `useState` would differ between the two and hydrate with a
 * mismatch.
 */
function buildDefaults(
  rows: SleepLogRow[],
  todayKey: string,
  today: Date,
  timeZone: string
): SleepEntryDefaults {
  const existing = rows.find((row) => row.localDate === todayKey);

  if (existing) {
    return {
      bedClock: minutesToClock(
        localClockMinutes(new Date(existing.bedAt), timeZone)
      ),
      wakeClock: minutesToClock(
        localClockMinutes(new Date(existing.wakeAt), timeZone)
      ),
      quality: existing.quality,
      latencyMin: existing.latencyMin,
      awakeningsMin: existing.awakeningsMin,
      factors: existing.factors,
      isFreeDay: existing.isFreeDay,
      note: existing.note,
    };
  }

  const sampleFrom = localDateKey(addDays(today, -(MEDIAN_SAMPLE_DAYS - 1)));
  const recentBedtimes = rows
    .filter((row) => row.localDate >= sampleFrom)
    .map((row) => row.bedAt);

  const nowMin = localClockMinutes(new Date(), timeZone);

  return {
    bedClock: medianBedClock(recentBedtimes, timeZone) ?? FALLBACK_BED_CLOCK,
    wakeClock: minutesToClock(Math.round(nowMin / 5) * 5),
    quality: null,
    latencyMin: null,
    awakeningsMin: null,
    factors: [],
    // Saturday or Sunday. `today` is UTC midnight standing for the owner's
    // calendar day, so its UTC weekday IS the local one. A guess, and shown as
    // a checkbox precisely because holidays and shift work break it.
    isFreeDay: today.getUTCDay() === 0 || today.getUTCDay() === 6,
    note: null,
  };
}
