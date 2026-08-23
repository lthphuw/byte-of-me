/**
 * Seconds as a clock.
 *
 * Not `splitMinutes` from `shared/lib/health/duration.ts`, and the difference
 * is the unit the reader is working in. That function splits a night's sleep
 * into hours and minutes for a sentence a translator writes ("7 giờ 30 phút");
 * this one prints a running timer, where the seconds are the point and the
 * format is a colon, not a sentence — `1:45` is not language, and translating
 * it would be translating a stopwatch.
 *
 * Padded on the right of the colon and unpadded on the left, the way every
 * stopwatch reads, and rendered under `tabular-nums` at the call sites so the
 * digits do not shuffle as they change.
 */
export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const mmss = `${minutes}:${String(seconds).padStart(2, '0')}`;

  // An hour in, minutes have to be padded too or `1:5:03` reads as five
  // minutes past one.
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
        2,
        '0'
      )}`
    : mmss;
}

/** Whole minutes between two instants, floored at zero. What the finish sheet
 *  reports as the session's duration, and what `finishWorkoutSession` will
 *  derive again from the timestamps it stores. */
export function elapsedMinutes(startedAtIso: string, now: number): number {
  const started = new Date(startedAtIso).getTime();
  if (!Number.isFinite(started)) return 0;

  return Math.max(0, Math.floor((now - started) / 60_000));
}

/** Whole seconds since an instant, floored at zero. Computed from the stored
 *  timestamp on every render rather than counted up, so a tab that was frozen
 *  in a pocket comes back reading the truth (`use-rest-timer.ts`). */
export function elapsedSeconds(startedAtIso: string, now: number): number {
  const started = new Date(startedAtIso).getTime();
  if (!Number.isFinite(started)) return 0;

  return Math.max(0, Math.floor((now - started) / 1000));
}
