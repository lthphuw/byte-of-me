import { minutesToClock } from '@/shared/lib/health/duration';

const DAY_MIN = 1440;
const HALF_DAY_MIN = 720;

/**
 * The bedtime an unopened form should already be showing.
 *
 * The median rather than a hardcoded 23:00, and rather than the mean: a single
 * night out until 04:00 drags an average by half an hour and would then be
 * saved back as the new normal on the next one-tap morning, while the median
 * ignores it entirely. With no history at all the caller supplies the
 * fallback — this returns null rather than inventing one.
 *
 * Bedtimes are placed on a scale that runs THROUGH midnight before they are
 * sorted: 23:40 is -20 and 00:20 is +20, twenty minutes on either side of the
 * boundary. On the raw 0..1439 scale those two sit at opposite ends, and the
 * median of a sleeper who crosses midnight half the time would land near noon.
 */
export function medianBedClock(
  bedAtIso: string[],
  timeZone: string
): string | null {
  if (bedAtIso.length === 0) return null;

  const centred = bedAtIso
    .map((iso) => localClockMinutes(new Date(iso), timeZone))
    .map((minutes) => (minutes >= HALF_DAY_MIN ? minutes - DAY_MIN : minutes))
    .sort((a, b) => a - b);

  // The lower of the two middle values on an even count, not their mean: a
  // clock time is what is wanted back, and averaging 22:00 with 23:00 to get
  // 22:30 invents a bedtime that never happened.
  const median = centred[Math.floor((centred.length - 1) / 2)];

  return minutesToClock(median);
}

/** Minutes past midnight of `instant` as read in `timeZone`. Via
 *  `formatToParts` rather than a formatted string, because the `h23` / `h24`
 *  hour-cycle difference between engines renders midnight as either `00:00` or
 *  `24:00` and only the parts are unambiguous. */
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
