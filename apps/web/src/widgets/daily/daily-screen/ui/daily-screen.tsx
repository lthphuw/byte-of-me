import { CalendarOff, TriangleAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { type CoverageCell, SleepCoverage } from './sleep-coverage';
import { SleepInsightsPanel } from './sleep-insights-panel';
import { type LoggedNight, SleepMonthBoard } from './sleep-month-board';
import { SleepMonthSummary } from './sleep-month-summary';
import { SleepStatsPanel } from './sleep-stats-panel';

// The DEEP path, never `@/entities/day-entry`. That barrel re-exports the
// whole `./api` folder, so a screen that only READS days would also pull in
// every WRITE — `uploadDayPhotos` and the image encoder behind it among them.
// Same rule as `49b13d47`: reach past a slice's barrel when the barrel's other
// exports are heavier than what you came for. (This is hygiene, not the fix
// for the 500 that sent us here — the day journal on this page owns
// `uploadDayPhotos` legitimately, so the encoder is in the route's graph
// either way. What stopped the crash is `compress-image.ts` loading `sharp`
// inside its function rather than at module scope; see the note there.)
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

/** The raster's window and the fortnight `getSleepSummary` computes its
 *  deviations over. Debt is measured against a free-day need a fortnight
 *  cannot supply, so it does not live here. */
const WINDOW_DAYS = 14;

/** How far the insight panel looks back. WHOOP's window, and the ceiling
 *  `sleepInsightsSchema` enforces — a contrast that reaches further keeps
 *  voting with a habit the owner has since dropped. */
const INSIGHT_DAYS = 90;

/** The coverage grid: seven columns, five weeks, ending in the week that holds
 *  today. Its denominator counts only the days that have happened. */
const COVERAGE_WEEKS = 5;

/** With no target read from settings, the calendar still has to band its
 *  shades against a night length. Eight hours. Never PRINTED, so it stays a
 *  drawing default and never becomes a claim about the owner's goal. */
const FALLBACK_TARGET_MIN = 480;

/**
 * Last night and the fortnight first; the month is reference material under
 * it. Tapping a day on the calendar opens the sheet that writes it.
 *
 * **The month is a search param, the day is React state.** `?month=YYYY-MM` is
 * read HERE, so the query is sized by what is on screen and a month is
 * linkable. Which day's sheet is open stays client state, because every row
 * for the visible month is already on the client.
 *
 * **Two windows, three reads, merged.** The month on screen and the fortnight
 * the raster needs are only the same window while the current month is
 * showing. `readRanges` decides whether that is one read or two, and the rows
 * are merged by day because the same night can come back from both. Day
 * entries are read for the MONTH window only.
 *
 * No read throws. All three are awaited by an RSC, where a throw replaces the
 * whole page with the root `error.tsx` — including the calendar, which needs
 * none of them to work.
 */
export async function DailyScreen({ month }: { month?: string }) {
  const t = await getTranslations('dashboard.daily');
  const locale = await getLocale();
  const timeZone = await getRequestTimeZone();

  const today = toLocalDate(new Date(), timeZone);
  const todayKey = localDateKey(today);
  const currentMonthStart = startOfMonth(today);

  // A search param is text a reader can type. An unparseable or future month
  // falls back to the current one rather than drawing an empty grid for the
  // year 9999 — there are no nights ahead of today to page into.
  const requested = month === undefined ? null : parseMonthKey(month);
  const monthStart =
    requested === null || requested > currentMonthStart
      ? currentMonthStart
      : requested;

  const monthStartKey = localDateKey(monthStart);
  const monthLastKey = localDateKey(
    addDays(monthStart, daysInMonth(monthStart) - 1)
  );
  // Never read past today: rows cannot exist there, and the calendar draws
  // those days as pips rather than as missed nights.
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

  // Merged by day: the two sleep-log windows overlap whenever the current
  // month is on screen, and a night present twice would be counted twice by
  // the summary.
  const rows = [
    ...new Map(
      logResults
        .flatMap((res) => (res.success ? res.data : []))
        .map((row) => [row.localDate, row])
    ).values(),
  ].sort((a, b) => a.localDate.localeCompare(b.localDate));

  const targetMin = summary?.targetMin ?? FALLBACK_TARGET_MIN;
  // `.at(-1)` — `getSleepSummary` returns its nights in ascending date order,
  // so the last element is the most recent night it read.
  const lastNight = summary?.nights.at(-1) ?? null;

  const entryByDay = new Map(dayEntries.map((entry) => [entry.localDate, entry]));
  const rowByDay = new Map(rows.map((row) => [row.localDate, row]));
  const nightByDay = new Map(rows.map((row) => [row.localDate, toLoggedNight(row)]));

  // The union, not the sleep rows. A day can be written up without a night
  // logged — that is the whole reason DayEntry is a separate table — and such
  // a day still has to draw its dot.
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

  // A CALENDAR window, never a list of records: a missed night keeps its row
  // and draws nothing in it, which is the one thing a chart of durations could
  // not say.
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

  // Monday-first and anchored to the WEEK, not to today, so a column always
  // means the same weekday and the grid never reflows as the week advances.
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
          {/* 3fr / 2fr, and the fortnight FIRST in source order. The screen's
              first thought is last night and the fortnight; the month is
              reference material, so on a phone it stacks underneath and at
              `lg` it takes the narrower rail. At `max-w-4xl` that splits
              832px into roughly 480 / 320, which is still above the ~300px
              the seven-column grid needs to stay comfortable. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-6">
              {/* `destructive-text`, not `destructive`: §14 records that the
                  fill token measures 3.76:1 as text. On a sheet, not bare on
                  the ground — every other block in this column is a card. */}
              {failed ? (
                <p className="flex items-start gap-2 rounded-2xl border bg-card p-4 text-sm text-destructive-text shadow">
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {t('errors.load')}
                </p>
              ) : null}

              {/* One card, not a ring above a bar chart. The figure is last
                  night's length and the rows under it are the fortnight it
                  belongs to, so the answer and its context are one glance
                  rather than two cards saying the same thing twice. */}
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
                  // A crossed-out calendar at the raster's own height, so the
                  // card does not visibly shorten the moment a night lands.
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

/**
 * `computeNight` rather than `wakeAt - bedAt`, so every figure on the screen is
 * time ASLEEP — latency and recorded awakenings taken off. It runs on the
 * SERVER for every consumer, so the statistics module never reaches the
 * browser.
 */
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

/**
 * One night placed on the raster's 18:00 → 12:00 axis, in the reader's zone.
 *
 * Onset is clamped to the wake boundary and rise to the wake one, because a
 * latency long enough to pass the alarm, or a `riseAt` written before the
 * chronological repair existed, would otherwise draw a negative segment.
 */
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

/**
 * One read or two, depending on whether the windows touch.
 *
 * Overlapping windows become their union — the common case, where the month on
 * screen is the current one and the fortnight sits inside it. Disjoint windows
 * stay separate, so paging back to January reads January and the last
 * fortnight rather than everything between them.
 */
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
