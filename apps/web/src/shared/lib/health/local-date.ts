/**
 * The `localDate` convention, in one place.
 *
 * Both health domains key on a calendar day rather than a timestamp, and the
 * rule is asymmetric on purpose: a SLEEP belongs to the day it ENDS (a night
 * from 23:40 to 07:10 is the morning's sleep, not the previous evening's), a
 * WORKOUT to the day it starts. Deciding that at write time is what keeps the
 * two tables joinable later; grouping timestamps by day at query time would
 * drift with the reader's timezone and put midnight-crossing rows on the
 * wrong day.
 *
 * The returned `Date` is UTC midnight. Postgres `DATE` has no time and no
 * zone, and Prisma hands it back as UTC midnight — so producing exactly that
 * makes the value round-trip unchanged, and makes `===` on
 * `localDateKey` a valid day comparison.
 *
 * `Intl.DateTimeFormat` with `en-CA` rather than manual offset arithmetic:
 * `en-CA` formats as `YYYY-MM-DD`, and the Intl database already knows every
 * DST rule we would otherwise reimplement badly.
 */

export function toLocalDate(instant: Date, timeZone: string): Date {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);

  return new Date(`${key}T00:00:00.000Z`);
}

export function localDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Whole-day arithmetic on a UTC-midnight value. Safe because the value has no
 *  local time component to be shifted by a DST boundary. */
export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}
