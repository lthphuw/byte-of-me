import { addDays, localDateKey } from '@/shared/lib/health/local-date';
import type { ChartPoint } from '@/shared/ui/chart';

export interface DayValue {
  /** `YYYY-MM-DD`, the same key `localDateKey` produces. */
  localDate: string;
  value: number | null;
}

/**
 * A dense run of days, from a sparse set of logged ones.
 *
 * Every chart in this module draws a CALENDAR window rather than a list of
 * records: a missed night has to leave a gap, and a series built by mapping
 * over the rows would silently close it up and draw four nights as if they
 * were consecutive. `null` — not `0` — for a day with no row, because
 * `ChartFrame` renders that as "—" for a screen reader and the bar chart skips
 * the bar entirely; zero would claim a night of no sleep.
 */
export function toDaySeries(
  entries: DayValue[],
  startKey: string,
  count: number,
  formatLabel: (key: string) => string
): ChartPoint[] {
  const byDay = new Map(entries.map((entry) => [entry.localDate, entry.value]));
  const start = new Date(`${startKey}T00:00:00.000Z`);

  return Array.from({ length: count }, (_, i) => {
    const key = localDateKey(addDays(start, i));

    return { label: formatLabel(key), value: byDay.get(key) ?? null };
  });
}

/** The 1st of `date`'s month, as another UTC-midnight value. */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** `YYYY-MM` — the month half of a `localDateKey`, and what the sleep screen
 *  carries in its search param. */
export function monthKey(date: Date): string {
  return localDateKey(date).slice(0, 7);
}

/**
 * The 1st of a `YYYY-MM` month, or `null` if the string is not one.
 *
 * Null rather than a throw or a silent fallback: this parses a SEARCH PARAM,
 * which is untrusted text a reader can type, and the caller is the only place
 * that knows what to show instead — here, the current month.
 */
export function parseMonthKey(key: string): Date | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return null;

  const parsed = new Date(`${key}-01T00:00:00.000Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The 1st of the month `count` months either side of `date`. */
export function addMonths(date: Date, count: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1)
  );
}

/**
 * How many days that month has.
 *
 * Day `0` of the NEXT month is the last day of this one, which is how the
 * platform answers February without anybody writing a leap-year rule.
 */
export function daysInMonth(date: Date): number {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

/**
 * Which column a day falls in on a Monday-first grid, 0–6.
 *
 * Fixed to Monday rather than read from the locale: `Intl` exposes the first
 * day of a week only through `weekInfo`, which Safari still does not
 * implement, and both locales this site ships (`en` here, `vi`) start the week
 * on Monday in practice. A wrong guess would shift every row of the calendar
 * by a day — worse than a stated convention.
 */
export function mondayIndex(date: Date): number {
  // getUTCDay: 0 is Sunday. Sunday is the LAST column of the week that began
  // six days earlier, not the first of the one starting the next morning.
  return (date.getUTCDay() + 6) % 7;
}
