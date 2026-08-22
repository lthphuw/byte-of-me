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

/**
 * The Monday on or before `date`, as another UTC-midnight value.
 *
 * Fixed to Monday rather than read from the locale: `Intl` exposes the first
 * day of a week only through `weekInfo`, which Safari still does not implement,
 * and both locales this site ships (`en` here, `vi`) start the week on Monday
 * in practice. A wrong guess would shift every column of the heatmap by a day
 * — worse than a stated convention.
 */
export function startOfWeek(date: Date): Date {
  // getUTCDay: 0 is Sunday. Sunday belongs to the week that began six days
  // earlier, not to the one starting the next morning.
  const offset = (date.getUTCDay() + 6) % 7;

  return addDays(date, -offset);
}
