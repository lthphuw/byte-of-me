import { getTranslations } from 'next-intl/server';

import { SleepStatsPanel } from './sleep-stats-panel';

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
import { clockToMinutes, minutesToClock } from '@/shared/lib/health/duration';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { computeNight } from '@/shared/lib/health/sleep-stats';

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

/** With no target read from settings, the wake-time default still needs a
 *  night length to add to bedtime. Eight hours, the same figure the hero's
 *  arc falls back to. */
const FALLBACK_TARGET_MIN = 480;

/**
 * Below this, "now" cannot plausibly be the end of the night the form is
 * about. See `buildDefaults`.
 */
const MIN_PLAUSIBLE_NIGHT_MIN = 240;

const DAY_MIN = 1440;

/**
 * Log a night, then look at the fortnight it belongs to.
 *
 * A server component that renders a client form: the entry surface is the
 * interactive part and everything below it is derived numbers, so only the
 * form and the two charts cross into the browser. The statistics and the
 * history are passed INTO the form rather than rendered after it, because the
 * form owns the page's scroll area — the save bar has to sit outside it to
 * stay under a thumb while the charts scroll past.
 *
 * They arrive as two slots rather than one `children` because the desktop
 * layout is not the phone layout with wider margins: at `lg` the statistics
 * sit BESIDE the entry column (`aside`) and the charts run full width beneath
 * both (`children`). Below `lg` the same three blocks stack in that order,
 * which is also their reading order — enter, then read.
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
  const defaults = buildDefaults(
    rows,
    todayKey,
    today,
    timeZone,
    summary?.targetMin ?? FALLBACK_TARGET_MIN
  );

  return (
    <SleepEntryForm
      defaults={defaults}
      targetMin={summary?.targetMin}
      aside={
        <>
          {/* `destructive-text`, not `destructive`: §14 records that the fill
              token measures 3.76:1 as text. */}
          {failed ? (
            <p className="text-sm text-destructive-text">{t('errors.load')}</p>
          ) : null}

          {summary ? (
            <SleepStatsPanel summary={summary} todayKey={todayKey} />
          ) : null}
        </>
      }
    >
      <section className="border-t pt-6">
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('sleep.noHistory')}
          </p>
        ) : (
          // Side by side from `md` up. The heatmap draws at a fixed 14px cell
          // and scrolls inside its own frame, so a wider box gives it room
          // rather than stretching it; the duration chart is pure ratio and
          // simply gets taller bars to read.
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
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
          </div>
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
 * Otherwise bedtime is the median of the last fortnight, and wake time is
 * "now, rounded to five minutes" ONLY WHEN NOW IS PLAUSIBLY THE END OF THAT
 * NIGHT. It was unconditional, and that produced the worst first impression
 * this screen could give: opening it at 23:10 against a 23:00 median bedtime
 * showed a ten-minute night, and 23:10 is exactly when someone reaches for a
 * sleep app. The midnight-crossing arithmetic was never wrong — 23:00 → 07:10
 * has always given 8h 10m — the defaults were simply describing an evening as
 * if it were a morning.
 *
 * So: measure the candidate night. Under four hours means the form was opened
 * before the night it is about has happened, and the honest default is the
 * night the author is AIMING for — bedtime plus their nightly target. Four
 * hours rather than a "is it morning?" hour test, because the threshold that
 * matters is the length of the night, not the position of the clock: a shift
 * worker going to bed at 08:00 gets the same sensible default, and no hour of
 * the day is hardcoded anywhere.
 *
 * Both clocks are resolved here rather than in the browser so that the
 * server's markup and the first client render agree — a clock computed in
 * `useState` would differ between the two and hydrate with a mismatch.
 */
function buildDefaults(
  rows: SleepLogRow[],
  todayKey: string,
  today: Date,
  timeZone: string,
  targetMin: number
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

  const bedClock =
    medianBedClock(recentBedtimes, timeZone) ?? FALLBACK_BED_CLOCK;
  const bedMin = clockToMinutes(bedClock) ?? 0;

  const nowMin = Math.round(localClockMinutes(new Date(), timeZone) / 5) * 5;
  // The short way round, the same rule the form itself uses for the duration
  // it displays — so this test and that figure can never disagree.
  const candidateNightMin = (((nowMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  const wakeMin =
    candidateNightMin >= MIN_PLAUSIBLE_NIGHT_MIN ? nowMin : bedMin + targetMin;

  return {
    bedClock,
    wakeClock: minutesToClock(wakeMin),
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
