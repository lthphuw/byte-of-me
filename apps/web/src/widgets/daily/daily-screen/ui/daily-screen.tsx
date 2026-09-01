import { CalendarOff, TriangleAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { type CoverageCell, SleepCoverage } from './sleep-coverage';
import { SleepInsightsPanel } from './sleep-insights-panel';
import { type LoggedNight, SleepMonthBoard } from './sleep-month-board';
import { SleepMonthSummary } from './sleep-month-summary';
import { SleepStatsPanel } from './sleep-stats-panel';

// The DEEP path, never the `@/entities/day-entry` barrel: that barrel
// re-exports every WRITE, image encoder included, into a screen that only
// reads. Same rule as `49b13d47`.
import { getDayEntries } from '@/entities/day-entry/api/get-day-entries';
import {
  getSleepInsights,
  getSleepLogs,
  getSleepSummary,
  type SleepLogRow,
} from '@/entities/sleep-log';
import {
  addMonths,
  daysInMonth,
  mondayIndex,
  monthDisplay,
  monthKey,
  parseMonthKey,
  type RasterBand,
  type RasterNight,
  rasterOffset,
  SleepRaster,
  startOfMonth,
} from '@/features/daily/sleep-charts';
import {
  localClockMinutes,
  medianOf,
  roundedNowMin,
} from '@/features/daily/sleep-entry';
import {
  formatDayWithWeekday,
  formatWeekdayInitialDay,
} from '@/shared/lib/health/day-label';
import { minutesToClock, splitMinutes } from '@/shared/lib/health/duration';
import {
  addDays,
  localDateKey,
  toLocalDate,
} from '@/shared/lib/health/local-date';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { computeNight, minutesStdDev } from '@/shared/lib/health/sleep-stats';

/** The raster's window, and the one `getSleepSummary` deviates over. Debt
 *  needs a free-day baseline a fortnight cannot supply, so it is not here. */
const WINDOW_DAYS = 14;

/** How far the insight panel looks back — the ceiling `sleepInsightsSchema`
 *  enforces. Further back keeps voting with a habit since dropped. */
const INSIGHT_DAYS = 90;

/** Coverage: seven columns, five weeks, ending in today's week. The
 *  denominator counts only days that have happened. */
const COVERAGE_WEEKS = 5;

/** Only the calendar's shade banding. Never PRINTED, so it stays a drawing
 *  default rather than a claim about the owner's goal. */
const FALLBACK_TARGET_MIN = 480;

/**
 * Last night and the fortnight first; the month is reference material below.
 * `?month=` is read here so the query is SIZED by what is on screen. No read
 * throws — one throw in an RSC replaces the whole page with `error.tsx`.
 */
export async function DailyScreen({ month }: { month?: string }) {
  const t = await getTranslations('dashboard.daily');
  const locale = await getLocale();
  const timeZone = await getRequestTimeZone();

  const today = toLocalDate(new Date(), timeZone);
  const todayKey = localDateKey(today);
  const currentMonthStart = startOfMonth(today);

  // A search param is text a reader can type: unparseable or future falls
  // back to this month rather than drawing an empty grid for the year 9999.
  const requested = month === undefined ? null : parseMonthKey(month);
  const monthStart =
    requested === null || requested > currentMonthStart
      ? currentMonthStart
      : requested;

  const monthStartKey = localDateKey(monthStart);
  const monthLastKey = localDateKey(
    addDays(monthStart, daysInMonth(monthStart) - 1)
  );
  // Never past today: no rows can exist there, and those days draw as pips.
  const monthReadTo = monthLastKey > todayKey ? todayKey : monthLastKey;

  const rasterStart = addDays(today, -(WINDOW_DAYS - 1));
  const rasterStartKey = localDateKey(rasterStart);

  const ranges = readRanges(
    { from: monthStartKey, to: monthReadTo },
    { from: rasterStartKey, to: todayKey }
  );

  const [summaryRes, insightsRes, dayEntriesRes, ...logResults] =
    await Promise.all([
      getSleepSummary({ days: WINDOW_DAYS, timeZone }),
      getSleepInsights({ days: INSIGHT_DAYS, timeZone }),
      getDayEntries({ from: monthStartKey, to: monthReadTo }),
      ...ranges.map((range) => getSleepLogs(range)),
    ]);

  const summary = summaryRes.success ? summaryRes.data : null;
  const insights = insightsRes.success ? insightsRes.data : null;
  const dayEntries = dayEntriesRes.success ? dayEntriesRes.data : [];
  const failed =
    !summaryRes.success ||
    !insightsRes.success ||
    !dayEntriesRes.success ||
    logResults.some((res) => !res.success);

  // Merged by day — the two windows overlap on the current month, and a
  // night present twice would be counted twice.
  const rows = [
    ...new Map(
      logResults
        .flatMap((res) => (res.success ? res.data : []))
        .map((row) => [row.localDate, row])
    ).values(),
  ].sort((a, b) => a.localDate.localeCompare(b.localDate));

  const targetMin = summary?.targetMin ?? FALLBACK_TARGET_MIN;
  // `getSleepSummary` returns nights ascending, so `.at(-1)` is the latest.
  const lastNight = summary?.nights.at(-1) ?? null;

  const entryByDay = new Map(dayEntries.map((entry) => [entry.localDate, entry]));
  const rowByDay = new Map(rows.map((row) => [row.localDate, row]));
  const nightByDay = new Map(rows.map((row) => [row.localDate, toLoggedNight(row)]));

  // The UNION, not the sleep rows: a day written up without a night logged
  // still has to draw its dot.
  const nights: LoggedNight[] = [
    ...new Set([...nightByDay.keys(), ...entryByDay.keys()]),
  ]
    .sort()
    .map((key) => {
      const night = nightByDay.get(key);
      const entry = entryByDay.get(key) ?? null;

      return {
        localDate: key,
        totalSleepMin: night?.totalSleepMin ?? null,
        mood: entry?.mood ?? null,
        hasEntry: Boolean(
          entry && (entry.reflection !== null || entry.photos.length > 0)
        ),
      };
    });

  const monthNights = nights.filter(
    (night) =>
      night.localDate >= monthStartKey && night.localDate <= monthLastKey
  );

  // A CALENDAR window, not a list of records: a missed night keeps its row
  // and draws nothing — the one thing a chart of durations cannot say.
  const rasterNights: RasterNight[] = Array.from(
    { length: WINDOW_DAYS },
    (_, i) => {
      const key = localDateKey(addDays(rasterStart, i));
      const row = rowByDay.get(key) ?? null;
      const geometry = row === null ? null : toRasterGeometry(row, timeZone);

      return {
        localDate: key,
        shortLabel: formatWeekdayInitialDay(key, locale),
        label: formatDayWithWeekday(key, locale),
        span:
          geometry === null
            ? null
            : {
                ...geometry.offsets,
                text: t('sleep.rasterRow', {
                  bed: geometry.bedClock,
                  rise: geometry.riseClock,
                  ...splitMinutes(geometry.totalSleepMin),
                }),
              },
      };
    }
  );

  const spans = rasterNights.flatMap((night) =>
    night.span === null ? [] : [night.span]
  );
  const bedBand = toBand(spans.map((span) => span.bedOffset));
  const wakeBand = toBand(spans.map((span) => span.wakeOffset));

  // Anchored to the WEEK, not to today, so a column always means the same
  // weekday and the grid does not reflow as the week advances.
  const coverageEnd = addDays(today, 6 - mondayIndex(today));
  const coverageStart = addDays(coverageEnd, -(COVERAGE_WEEKS * 7 - 1));
  const loggedDates = new Set(insights?.loggedDates ?? []);
  const coverageCells: CoverageCell[] = Array.from(
    { length: COVERAGE_WEEKS * 7 },
    (_, i) => {
      const key = localDateKey(addDays(coverageStart, i));
      if (key > todayKey) return { key, state: 'future' };

      return { key, state: loggedDates.has(key) ? 'logged' : 'missed' };
    }
  );
  const coverageDayCount = coverageCells.filter(
    (cell) => cell.state !== 'future'
  ).length;
  const coverageLogged = coverageCells.filter(
    (cell) => cell.state === 'logged'
  ).length;

  const nextMonth = addMonths(monthStart, 1);
  const monthLabel = monthDisplay(monthStartKey);
  const monthSpoken = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthStart);
  const shortDayFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          {/* Fortnight FIRST in source order, so it stacks on top of the
              month on a phone. 3fr/2fr splits `max-w-4xl` into ~480/320,
              above the ~300px the seven-column grid needs. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6">
              {/* `destructive-text`, not `destructive`: the fill token
                  measures 3.76:1 as text (§14). */}
              {failed ? (
                <p className="flex items-start gap-2 rounded-2xl border bg-card p-4 text-sm text-destructive-text shadow">
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {t('errors.load')}
                </p>
              ) : null}

              {/* One card: the figure is last night, the rows under it are
                  the fortnight it belongs to. One glance, not two. */}
              <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('lastNight.label')}
                  </p>
                  <p className="text-3xl font-semibold tabular-nums leading-tight">
                    {lastNight === null
                      ? '—'
                      : t(
                          'units.hoursMinutes',
                          splitMinutes(lastNight.totalSleepMin)
                        )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lastNight === null
                      ? t('lastNight.noData')
                      : lastNight.estimated
                        ? t('lastNight.estimated')
                        : t('sleep.nightlyTarget', splitMinutes(targetMin))}
                  </p>
                </div>

                {spans.length === 0 ? (
                  // At the raster's own height, so the card does not shorten
                  // the moment a first night lands.
                  <div className="flex min-h-[9rem] flex-col items-center justify-center gap-2 text-center">
                    <CalendarOff
                      aria-hidden
                      className="size-6 shrink-0 text-muted-foreground"
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('sleep.noHistory')}
                    </p>
                  </div>
                ) : (
                  <SleepRaster
                    nights={rasterNights}
                    bedBand={bedBand}
                    wakeBand={wakeBand}
                    title={t('sleep.raster', { days: WINDOW_DAYS })}
                    summary={t('sleep.rasterSummary', { days: WINDOW_DAYS })}
                    valueLabel={t('sleep.rasterNight')}
                  />
                )}
              </section>

              {summary ? (
                <SleepStatsPanel
                  summary={summary}
                  debt={insights?.debt ?? null}
                  windowDays={WINDOW_DAYS}
                />
              ) : null}

              <SleepCoverage
                cells={coverageCells}
                loggedCount={coverageLogged}
                dayCount={coverageDayCount}
              />

              {insights ? <SleepInsightsPanel insights={insights} /> : null}
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              <div className="min-w-0 rounded-3xl border bg-card p-5 shadow">
                <SleepMonthBoard
                  nights={nights}
                  rows={rows}
                  dayEntries={dayEntries}
                  monthStartKey={monthStartKey}
                  todayKey={todayKey}
                  timeZone={timeZone}
                  targetMin={targetMin}
                  nowMin={roundedNowMin(new Date(), timeZone)}
                  prevMonthKey={monthKey(addMonths(monthStart, -1))}
                  nextMonthKey={
                    nextMonth > currentMonthStart ? null : monthKey(nextMonth)
                  }
                />
              </div>

              <SleepMonthSummary
                nights={monthNights}
                monthLabel={monthLabel}
                monthSpokenLabel={monthSpoken}
                targetMin={targetMin}
                formatDay={(key) =>
                  shortDayFormat.format(new Date(`${key}T00:00:00.000Z`))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** `computeNight`, not `wakeAt - bedAt`: every figure on screen is time
 *  ASLEEP. Server-side, so the statistics module stays out of the bundle. */
function toLoggedNight(row: SleepLogRow): { totalSleepMin: number } {
  const night = computeNight({
    localDate: new Date(`${row.localDate}T00:00:00.000Z`),
    bedAt: new Date(row.bedAt),
    wakeAt: new Date(row.wakeAt),
    latencyMin: row.latencyMin,
    awakeningsMin: row.awakeningsMin,
  });

  return { totalSleepMin: night.totalSleepMin };
}

/** One night on the raster's 18:00 → 12:00 axis, in the reader's zone. Onset
 *  and rise are clamped to the wake boundary: a latency past the alarm, or a
 *  `riseAt` predating the chronological repair, would draw backwards. */
function toRasterGeometry(row: SleepLogRow, timeZone: string) {
  const bedMin = localClockMinutes(new Date(row.bedAt), timeZone);
  const wakeMin = localClockMinutes(new Date(row.wakeAt), timeZone);
  const riseMin =
    row.riseAt === null
      ? wakeMin
      : localClockMinutes(new Date(row.riseAt), timeZone);

  const bedOffset = rasterOffset(bedMin);
  const wakeOffset = rasterOffset(wakeMin);
  const night = computeNight({
    localDate: new Date(`${row.localDate}T00:00:00.000Z`),
    bedAt: new Date(row.bedAt),
    wakeAt: new Date(row.wakeAt),
    riseAt: row.riseAt === null ? null : new Date(row.riseAt),
    latencyMin: row.latencyMin,
    awakeningsMin: row.awakeningsMin,
  });

  return {
    bedClock: minutesToClock(bedMin),
    riseClock: minutesToClock(riseMin),
    totalSleepMin: night.totalSleepMin,
    offsets: {
      bedOffset,
      onsetOffset: Math.min(wakeOffset, bedOffset + (row.latencyMin ?? 0)),
      wakeOffset,
      riseOffset: Math.max(wakeOffset, rasterOffset(riseMin)),
    },
  };
}

/** Median ± population SD of one boundary, on the axis's own scale. Null below
 *  two nights, where a deviation is not defined. */
function toBand(offsets: number[]): RasterBand | null {
  const centreOffset = medianOf(offsets);
  const sdMin = minutesStdDev(offsets);

  return centreOffset === null || sdMin === null
    ? null
    : { centreOffset, sdMin };
}

/** One read or two. Overlapping windows become their union; disjoint ones
 *  stay separate, so paging back to January does not read the months in
 *  between. */
function readRanges(
  month: { from: string; to: string },
  raster: { from: string; to: string }
): Array<{ from: string; to: string }> {
  if (month.from <= raster.to && raster.from <= month.to) {
    return [
      {
        from: month.from < raster.from ? month.from : raster.from,
        to: month.to > raster.to ? month.to : raster.to,
      },
    ];
  }

  return [month, raster];
}
