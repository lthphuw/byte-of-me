import { minutesToClock } from '@/shared/lib/health/duration';

const DAY_MIN = 1440;
const HALF_DAY_MIN = 720;

/**
 * The fortnight's usual bedtime. A median, never a mean — one night out until
 * 04:00 drags an average and is then saved back as the new normal. Null with
 * no history: the caller owns the fallback.
 *
 * Sorted on a scale running THROUGH midnight (23:40 is -20, 00:20 is +20).
 * On the raw 0..1439 scale those sit at opposite ends, and a sleeper who
 * crosses midnight half the time would median out near noon.
 */
export function medianBedClock(
  bedAtIso: string[],
  timeZone: string
): string | null {
  if (bedAtIso.length === 0) return null;

  const centred = bedAtIso
    .map((iso) => localClockMinutes(new Date(iso), timeZone))
    .map((minutes) => (minutes >= HALF_DAY_MIN ? minutes - DAY_MIN : minutes));

  const median = medianOf(centred);

  return median === null ? null : minutesToClock(median);
}

/** The lower of the two middle values on an even count, never their mean:
 *  averaging 22:00 with 23:00 invents a bedtime that never happened, and
 *  every suggested figure has to be one the author recorded. */
export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/** Minutes past midnight of `instant` in `timeZone`. Via `formatToParts`:
 *  the `h23`/`h24` hour-cycle difference between engines renders midnight as
 *  `00:00` or `24:00`, and only the parts are unambiguous. */
export function localClockMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  return (((hour * 60 + minute) % DAY_MIN) + DAY_MIN) % DAY_MIN;
}
