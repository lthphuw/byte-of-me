import { formatDate } from '@/shared/lib/utils';

/**
 * Two formatters that cannot disagree between the server render and the first
 * client render.
 *
 * next-intl's `useFormatter` is the usual answer, and it is the wrong one
 * here: this app's request config declares no `timeZone`, so a `dateTime` call
 * falls back to the environment's zone — UTC on the server, the reader's zone
 * in the browser — and formats a different string on each side of hydration.
 * Both functions below take the zone as an ARGUMENT instead, so what the
 * server printed is what the client prints.
 *
 * Neither is health-specific: a `YYYY-MM-DD` day key and an instant with the
 * zone it should be read in are both general shapes, which is why they sit in
 * `shared/lib` beside `formatDate` rather than in a feature.
 */

/**
 * A `YYYY-MM-DD` day key as a written date.
 *
 * Read back in **UTC**, deliberately. The key already IS a local calendar day
 * — `toLocalDate` resolved the zone when it was written — so parsing it as
 * midnight UTC and formatting it in UTC returns the same day it names. Any
 * other zone shifts it: `2026-08-23` read in `America/Los_Angeles` prints the
 * 22nd.
 */
export function formatDayKey(
  dayKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }
): string {
  return (
    formatDate(`${dayKey}T00:00:00.000Z`, locale, {
      ...options,
      timeZone: 'UTC',
    }) ?? dayKey
  );
}

/** An ISO instant as a clock time in a named zone. */
export function formatClock(
  iso: string,
  locale: string,
  timeZone: string
): string {
  return (
    formatDate(iso, locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }) ?? ''
  );
}
