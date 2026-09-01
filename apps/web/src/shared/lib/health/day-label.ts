/**
 * Turning a `localDate` key into a label a chart axis can carry.
 *
 * `timeZone: 'UTC'` is not a detail to tidy away. A `localDate` key stands for
 * a calendar day and is handled everywhere as UTC midnight (`local-date.ts`),
 * so formatting it in the reader's zone renders the 22nd as the 21st for
 * anyone west of Greenwich — the one bug the whole convention exists to
 * avoid.
 *
 * These run on the SERVER, in the screens, and the formatted strings are
 * passed to the client charts as plain `label` props. Only `formatValue` has
 * to be owned on the client, because it is a function and functions do not
 * cross the boundary; an axis label is a string and crosses fine. That also
 * keeps `Intl` off the client for the axis entirely.
 *
 * `gym-charts` and `sleep-charts` each kept a private copy of these. Folded
 * here because a feature reaching into another feature's internals is the
 * sideways import AGENTS §3 rules out, and both slices are now open for
 * edit.
 */

export function formatDay(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00.000Z`));
}

/** `W 26` / `T4 26` — the narrowest a raster row's gutter can be labelled.
 *  Two formatters, because `weekday: 'narrow'` beside `day: 'numeric'` renders
 *  "T4, ngày 26" in Vietnamese, three times the width the gutter has. */
export function formatWeekdayInitialDay(key: string, locale: string): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  }).format(date);

  return `${weekday} ${date.getUTCDate()}`;
}

export function formatDayWithWeekday(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00.000Z`));
}
