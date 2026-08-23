import { CalendarOff, TriangleAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

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
} from '@/features/daily/sleep-charts';
import {
  roundedNowMin,
  SleepDurationHero,
} from '@/features/daily/sleep-entry';
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
 * The month and its statistics; tapping a day opens the sheet that writes it.
 *
 * **The calendar leads.** It used to be the last thing on the screen, a
 * picture of a month under a form that only ever edited today. It is now the
 * first thing and it is a CONTROL: tapping a day opens the sheet for that
 * night, and saving writes that day. Nothing about the write path had to
 * change for it — see `useSleepEntry`, which places the wake instant on the
 * chosen day and lets the server derive the date from it exactly as before.
 *
 * **The month is a search param, the day is React state.** That split is the
 * answer to the objection that killed month arrows the first time: a window
 * the server read cannot see forces a refetch per arrow or a pre-read of
 * months nobody opens. `?month=YYYY-MM` is read HERE, so the query is sized by
 * what is on screen, the back button pages through months, and a month is
 * linkable. Which day's sheet is open stays client state because every row
 * for the visible month is already on the client — a tap has nothing to
 * fetch.
 *
 * **Two windows, three reads, merged.** The month on screen and the fortnight
 * the bar chart and the median bedtime need are different windows, and they
 * are only the same one while the current month is showing. Reading their
 * union unconditionally would mean scanning back to January to draw January
 * plus the last fortnight; reading them separately when they are disjoint
 * keeps every sleep-log query bounded by a month or by a fortnight.
 * `readRanges` decides which, and the rows are merged by day because the same
 * night can come back from both. Day entries are read for the MONTH window
 * only — the fortnight exists for the bar chart and the median bedtime,
 * neither of which touches a journal entry, so reading it there would scan
 * days nothing draws.
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

  const chartStart = addDays(today, -(WINDOW_DAYS - 1));
  const chartStartKey = localDateKey(chartStart);

  const ranges = readRanges(
    { from: monthStartKey, to: monthReadTo },
    { from: chartStartKey, to: todayKey }
  );

  const [summaryRes, dayEntriesRes, ...logResults] = await Promise.all([
    getSleepSummary({ days: WINDOW_DAYS, timeZone }),
    getDayEntries({ from: monthStartKey, to: monthReadTo }),
    ...ranges.map((range) => getSleepLogs(range)),
  ]);

  const summary = summaryRes.success ? summaryRes.data : null;
  const dayEntries = dayEntriesRes.success ? dayEntriesRes.data : [];
  const failed =
    !summaryRes.success ||
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
  const series: DayValue[] = nights
    .filter((night) => night.totalSleepMin !== null)
    .map((night) => ({
      localDate: night.localDate,
      value: night.totalSleepMin as number,
    }));

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
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          {/* 2fr / 3fr, not two halves: the calendar is a fixed 7-column grid
              that stops being comfortable below ~300px, while the statistics
              column is a 3-up tile row that wants every pixel it can have. At
              `max-w-4xl` that splits 832px into roughly 320 / 480. Below `lg`
              — the width at which `/space` shows its icon rail — the two
              stack, calendar first, because it is both the primary surface
              and the control everything under it depends on. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8">
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

            <div className="flex min-w-0 flex-col gap-6">
              {/* No "Log sleep" button beside it, unlike the hub this came from: tapping
                  today's cell on the calendar opens the same sheet and writes the same
                  row, and a second control for one action only raises the question of
                  whether the two do different things. `SleepDurationHero` already draws
                  its own `rounded-3xl border bg-card p-8 shadow` card — do not wrap it in
                  another one, or the ring sits inside two nested cards with a visible
                  double border and double shadow. */}
              <SleepDurationHero
                durationMin={lastNight?.totalSleepMin ?? null}
                targetMin={summary?.targetMin}
                label={t('lastNight.label')}
                emptyLabel={t('lastNight.noData')}
                footnote={
                  lastNight?.estimated ? t('lastNight.estimated') : undefined
                }
              />

              {/* `destructive-text`, not `destructive`: §14 records that the
                  fill token measures 3.76:1 as text. On a sheet, not bare on
                  the ground — every other block in this column is a card, and
                  a loose line of red text at the top of it read as a
                  rendering artefact rather than as the screen telling the
                  reader something. */}
              {failed ? (
                <p className="flex items-start gap-2 rounded-2xl border bg-card p-4 text-sm text-destructive-text shadow">
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {t('errors.load')}
                </p>
              ) : null}

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

              <section>
                {series.length === 0 ? (
                  // Where the fortnight of bars would be — and IN THE CARD the
                  // bars would have been in, rather than as a line of grey
                  // text where a card used to be. A crossed-out calendar says
                  // "no nights recorded", so the gap reads as a state and not
                  // as a block that failed to render. Centred and given the
                  // plot's own height, so the screen does not visibly shorten
                  // by 150px the moment the first night is logged.
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
            </div>
          </div>
        </div>
      </div>
    </div>
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
