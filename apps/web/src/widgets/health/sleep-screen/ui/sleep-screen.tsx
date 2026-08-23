import { CalendarOff, TriangleAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { type LoggedNight, SleepDayEditor } from './sleep-day-editor';
import { SleepMonthSummary } from './sleep-month-summary';
import { SleepStatsPanel } from './sleep-stats-panel';

import {
  getSleepLogs,
  getSleepSummary,
  type SleepLogRow,
} from '@/entities/sleep-log';
import {
  addMonths,
  daysInMonth,
  type DayValue,
  monthKey,
  parseMonthKey,
  SleepDurationChart,
  startOfMonth,
} from '@/features/health/sleep-charts';
import { roundedNowMin } from '@/features/health/sleep-entry';
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

/** With no target read from settings, two things still need a night length:
 *  the wake-time default has to add one to bedtime, and the calendar has to
 *  band its shades against one. Eight hours, the same figure the hero's arc
 *  falls back to. Neither use PRINTS it, so it stays a drawing default and
 *  never becomes a claim about the owner's goal. */
const FALLBACK_TARGET_MIN = 480;

/**
 * Pick a night from the month, then log or correct it.
 *
 * **The calendar leads.** It used to be the last thing on the screen, a
 * picture of a month under a form that only ever edited today. It is now the
 * first thing and it is a CONTROL: tapping a day loads that night into the
 * form below, and saving writes that day. Nothing about the write path had to
 * change for it — see `useSleepEntry`, which places the wake instant on the
 * chosen day and lets the server derive the date from it exactly as before.
 *
 * **The month is a search param, the day is React state.** That split is the
 * answer to the objection that killed month arrows the first time: a window
 * the server read cannot see forces a refetch per arrow or a pre-read of
 * months nobody opens. `?month=YYYY-MM` is read HERE, so the query is sized by
 * what is on screen, the back button pages through months, and a month is
 * linkable. The day inside it stays client state because every row for the
 * visible month is already on the client — a tap has nothing to fetch.
 *
 * **Two windows, two reads, merged.** The month on screen and the fortnight
 * the bar chart and the median bedtime need are different windows, and they
 * are only the same one while the current month is showing. Reading their
 * union unconditionally would mean scanning back to January to draw January
 * plus the last fortnight; reading them separately when they are disjoint
 * keeps every query bounded by a month or by a fortnight. `readRanges` decides
 * which, and the rows are merged by day because the same night can come back
 * from both.
 *
 * Neither failure throws. Both are awaited by an RSC, where a throw replaces
 * the whole page with the root `error.tsx` — including the form, which does
 * not need either read to work.
 */
export async function SleepScreen({ month }: { month?: string }) {
  const t = await getTranslations('dashboard.health');
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

  const chartStart = addDays(today, -(WINDOW_DAYS - 1));
  const chartStartKey = localDateKey(chartStart);

  const ranges = readRanges(
    { from: monthStartKey, to: monthReadTo },
    { from: chartStartKey, to: todayKey }
  );

  const [summaryRes, ...logResults] = await Promise.all([
    getSleepSummary({ days: WINDOW_DAYS, timeZone }),
    ...ranges.map((range) => getSleepLogs(range)),
  ]);

  const summary = summaryRes.success ? summaryRes.data : null;
  const failed = !summaryRes.success || logResults.some((res) => !res.success);

  // Merged by day: the two windows overlap whenever the current month is on
  // screen, and a night present twice would be counted twice by the summary.
  const rows = [
    ...new Map(
      logResults
        .flatMap((res) => (res.success ? res.data : []))
        .map((row) => [row.localDate, row])
    ).values(),
  ].sort((a, b) => a.localDate.localeCompare(b.localDate));

  const targetMin = summary?.targetMin ?? FALLBACK_TARGET_MIN;
  const nights = rows.map(toLoggedNight);
  const monthNights = nights.filter(
    (night) =>
      night.localDate >= monthStartKey && night.localDate <= monthLastKey
  );
  const series: DayValue[] = nights.map((night) => ({
    localDate: night.localDate,
    value: night.totalSleepMin,
  }));

  // Today when it is on screen, otherwise the last day of the month being
  // viewed — which is never in the future, because the month never is. A
  // calendar that opens with nothing selected would leave the form below it
  // describing no night at all.
  const initialSelectedKey =
    todayKey >= monthStartKey && todayKey <= monthLastKey
      ? todayKey
      : monthLastKey;

  const nextMonth = addMonths(monthStart, 1);
  const monthLabel = new Intl.DateTimeFormat(locale, {
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
    <SleepDayEditor
      nights={nights}
      rows={rows}
      monthStartKey={monthStartKey}
      todayKey={todayKey}
      initialSelectedKey={initialSelectedKey}
      timeZone={timeZone}
      targetMin={targetMin}
      nowMin={roundedNowMin(new Date(), timeZone)}
      prevMonthKey={monthKey(addMonths(monthStart, -1))}
      nextMonthKey={nextMonth > currentMonthStart ? null : monthKey(nextMonth)}
      aside={
        <>
          {/* `destructive-text`, not `destructive`: §14 records that the fill
              token measures 3.76:1 as text. */}
          {/* On a sheet, not bare on the ground. Every other block in this
              column is a card; a loose line of red text at the top of it read
              as a rendering artefact rather than as the screen telling the
              reader something. */}
          {failed ? (
            <p className="flex items-start gap-2 rounded-2xl border bg-card p-4 text-sm text-destructive-text shadow">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t('errors.load')}
            </p>
          ) : null}

          {/* First in the column, because it is what the grid directly above
              it adds up to. At `lg` that puts it beside the entry fields and
              immediately under the calendar it describes. */}
          <SleepMonthSummary
            nights={monthNights}
            monthLabel={monthLabel}
            targetMin={targetMin}
            formatDay={(key) =>
              shortDayFormat.format(new Date(`${key}T00:00:00.000Z`))
            }
          />

          {summary ? (
            <SleepStatsPanel
              summary={summary}
              todayKey={todayKey}
              windowDays={WINDOW_DAYS}
            />
          ) : null}
        </>
      }
    >
      <section>
        {series.length === 0 ? (
          // Where the fortnight of bars would be — and IN THE CARD the bars
          // would have been in, rather than as a line of grey text where a
          // card used to be. A crossed-out calendar says "no nights recorded"
          // — the same mark the hub uses for the same fact — so the gap reads
          // as a state and not as a block that failed to render. Centred and
          // given the plot's own height, so the screen does not visibly
          // shorten by 150px the moment the first night is logged.
          <div className="flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-3xl border bg-card p-5 text-center shadow">
            <CalendarOff
              aria-hidden
              className="size-6 shrink-0 text-muted-foreground"
            />
            <p className="text-sm text-muted-foreground">
              {t('sleep.noHistory')}
            </p>
          </div>
        ) : (
          // The same soft card the hub gives its chart, so moving between the
          // two tabs does not change what a chart is: a figure on a raised
          // sheet, never one floating on the ground `SpaceShell` paints.
          //
          // One card and not a two-up grid any more — the month calendar that
          // used to sit beside it is now the top of the screen. That also
          // retires the `md:items-start` this grid needed: with a single child
          // there is no tallest row member for the chart to be stretched to.
          <div className="rounded-3xl border bg-card p-5 shadow">
            <SleepDurationChart
              nights={series}
              startKey={chartStartKey}
              days={WINDOW_DAYS}
              targetMin={summary?.targetMin}
            />
          </div>
        )}
      </section>
    </SleepDayEditor>
  );
}

/**
 * `computeNight` rather than `wakeAt - bedAt`, so every figure on the screen is
 * time ASLEEP — latency and recorded awakenings taken off — exactly like every
 * other duration in this module. Re-deriving it here would be a second
 * definition of the one number the whole screen is about.
 *
 * It runs on the SERVER for every consumer: the calendar's shades, the bar
 * chart and the monthly summary all read the results rather than the rows, so
 * the statistics module never reaches the browser.
 */
function toLoggedNight(row: SleepLogRow): LoggedNight {
  const night = computeNight({
    localDate: new Date(`${row.localDate}T00:00:00.000Z`),
    bedAt: new Date(row.bedAt),
    wakeAt: new Date(row.wakeAt),
    latencyMin: row.latencyMin,
    awakeningsMin: row.awakeningsMin,
  });

  return {
    localDate: row.localDate,
    totalSleepMin: night.totalSleepMin,
    quality: row.quality,
  };
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
  chart: { from: string; to: string }
): Array<{ from: string; to: string }> {
  if (month.from <= chart.to && chart.from <= month.to) {
    return [
      {
        from: month.from < chart.from ? month.from : chart.from,
        to: month.to > chart.to ? month.to : chart.to,
      },
    ];
  }

  return [month, chart];
}
