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
 * `sleep-charts` keeps a private four-line equivalent of `formatDay`. It is
 * not imported here because a feature reaching into another feature's
 * internals is the sideways import AGENTS §3 rules out, and neither slice's
 * directory was open for edit when this one was written. Fold the two into
 * `shared/` the next time both are.
 */

export function formatDay(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00.000Z`));
}

export function formatDayWithWeekday(key: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00.000Z`));
}
