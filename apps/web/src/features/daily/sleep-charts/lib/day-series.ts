import { localDateKey } from '@/shared/lib/health/local-date';

/** The 1st of `date`'s month, as another UTC-midnight value. */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** `YYYY-MM` — the month half of a `localDateKey`, and what the sleep screen
 *  carries in its search param. */
export function monthKey(date: Date): string {
  return localDateKey(date).slice(0, 7);
}

/** `09/2026`, from any key that opens `YYYY-MM`. Built by hand rather than
 *  through `Intl`, so the header reads identically in both locales. */
export function monthDisplay(key: string): string {
  return `${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

/** The 1st of a `YYYY-MM` month, or `null`. Null rather than a throw or a
 *  fallback: this parses a SEARCH PARAM, and only the caller knows what to
 *  show instead. */
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

/** How many days that month has. Day `0` of the NEXT month is the last of
 *  this one — February, with no leap-year rule written here. */
export function daysInMonth(date: Date): number {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

/** Which column a day falls in on a Monday-first grid, 0–6. Fixed to Monday,
 *  not read from the locale: `Intl` exposes it only through `weekInfo`, which
 *  Safari lacks, and both shipped locales start on Monday anyway. */
export function mondayIndex(date: Date): number {
  // getUTCDay: 0 is Sunday. Sunday is the LAST column of the week that began
  // six days earlier, not the first of the one starting the next morning.
  return (date.getUTCDay() + 6) % 7;
}
