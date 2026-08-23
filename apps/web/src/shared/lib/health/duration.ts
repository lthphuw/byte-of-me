/**
 * Splitting a minute count for display.
 *
 * Here rather than inside a component because the hub, the sleep screen, the
 * entry form and the chart tooltips all render the same figure, and three of
 * those are on the other side of a server/client boundary from the fourth.
 *
 * It returns the PARTS rather than a formatted string on purpose: "7h 30m" is
 * UI text and lives in `dashboard.daily.units.*` and `dashboard.gym.units.*`
 * (the same strings, duplicated into both catalogues) — the Vietnamese is
 * "7 giờ 30 phút", not the English with the numbers swapped, so a formatter
 * built here would have to reach for `t` anyway.
 */
export function splitMinutes(total: number): {
  hours: number;
  minutes: number;
} {
  const safe = Math.max(0, Math.round(total));

  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

/** Minutes past local midnight as the `HH:MM` an `<input type="time">` reads
 *  and writes. Wraps, so a value pushed past midnight by arithmetic still
 *  renders a real clock time rather than `24:10`. */
export function minutesToClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** The inverse of `minutesToClock`. Returns null for anything that is not a
 *  well-formed `HH:MM` — an empty time input reads as `''`, and a form must
 *  treat that as "not answered" rather than as midnight. */
export function clockToMinutes(clock: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;

  return h * 60 + m;
}
