import { addDays, localDateKey } from '@/shared/lib/health/local-date';

/**
 * How far back the history list reads.
 *
 * No `'use client'` in this file, deliberately — the server prefetches
 * `workoutKeys.range(from, to)` and the client `useQuery` hydrates from it, so
 * both have to derive the same two strings from the same code. A constant or a
 * function imported out of a client module reaches the server as a
 * client-reference proxy, and the key then hashes differently on the two
 * sides: no error, no request, skeletons forever (AGENTS §6).
 */
export const HISTORY_WINDOWS = [30, 90, 365] as const;

export type HistoryWindow = (typeof HISTORY_WINDOWS)[number];

/** Ninety days: long enough that a training block is visible in one read,
 *  short enough that the query stays a range scan on
 *  `idx_workout_sessions_owner_date`. The one window worth prefetching. */
export const DEFAULT_HISTORY_DAYS: HistoryWindow = 90;

/**
 * The inclusive `[from, to]` window ending on `todayKey`.
 *
 * `todayKey` is resolved ONCE, on the server, from the request's time zone and
 * handed down as a prop — never recomputed from `new Date()` in the browser.
 * The two clocks disagree either side of local midnight and either side of a
 * geo-header guess, and a `to` that differs by a day is a different query key
 * for the same intent.
 *
 * The arithmetic is `shared/lib/health/local-date`'s, so a window here and a
 * window on the sleep side are the same kind of object.
 */
export function historyRange(
  todayKey: string,
  days: number
): { from: string; to: string } {
  const today = new Date(`${todayKey}T00:00:00.000Z`);

  return { from: localDateKey(addDays(today, -(days - 1))), to: todayKey };
}
