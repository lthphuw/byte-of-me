import { localClockMinutes, medianBedClock } from './median-bed-clock';

import type { SleepLogRow } from '@/entities/sleep-log';
import type { SleepEntryDefaults } from '@/features/health/sleep-entry/model/use-sleep-entry';
import { clockToMinutes, minutesToClock } from '@/shared/lib/health/duration';
import { addDays, localDateKey } from '@/shared/lib/health/local-date';

/** Bedtimes older than the summary window say nothing about what the form
 *  should open at. */
const MEDIAN_SAMPLE_DAYS = 14;

const FALLBACK_BED_CLOCK = '23:00';

/**
 * Below this, "now" cannot plausibly be the end of the night the form is
 * about. See `buildDayDefaults`.
 */
const MIN_PLAUSIBLE_NIGHT_MIN = 240;

const DAY_MIN = 1440;

/**
 * Minutes past local midnight, rounded to the five the time input steps in.
 *
 * Split out so the SERVER resolves it once and hands it to the form. The
 * defaults are now computed in the browser — the reader taps a day in the
 * calendar and the form has to follow without a round trip — and a clock read
 * from `new Date()` there would differ from the one the server rendered and
 * hydrate with a mismatch. Passing the number keeps both sides deterministic,
 * which is the same guarantee the old server-only `buildDefaults` gave.
 */
export function roundedNowMin(now: Date, timeZone: string): number {
  return Math.round(localClockMinutes(now, timeZone) / 5) * 5;
}

/**
 * What the form opens showing, for ANY day the calendar can select.
 *
 * The stored row wins outright when there is one: the write is an upsert, so
 * opening a day a second time is an EDIT, and a form that came up blank would
 * quietly offer to overwrite a saved night with its own defaults.
 *
 * Otherwise bedtime is the median of the last fortnight, and wake time is
 * "now, rounded to five minutes" ONLY WHEN NOW IS PLAUSIBLY THE END OF THAT
 * NIGHT. It was unconditional, and that produced the worst first impression
 * this screen could give: opening it at 23:10 against a 23:00 median bedtime
 * showed a ten-minute night, and 23:10 is exactly when someone reaches for a
 * sleep app. The midnight-crossing arithmetic was never wrong — 23:00 → 07:10
 * has always given 8h 10m — the defaults were simply describing an evening as
 * if it were a morning.
 *
 * So: measure the candidate night. Under four hours means the form was opened
 * before the night it is about has happened, and the honest default is the
 * night the author is AIMING for — bedtime plus their nightly target. Four
 * hours rather than a "is it morning?" hour test, because the threshold that
 * matters is the length of the night, not the position of the clock: a shift
 * worker going to bed at 08:00 gets the same sensible default, and no hour of
 * the day is hardcoded anywhere.
 *
 * **A PAST day takes that same branch unconditionally.** There is no clock
 * reading that describes a night which ended days ago, so "now" is not merely
 * implausible for it — it is meaningless, and offering it would be the 23:10
 * bug wearing a date. Bedtime plus the nightly target is the one honest guess
 * left, and it is the guess this function already had.
 *
 * The median bedtime is deliberately the SAME fortnight for every day rather
 * than the fortnight before the day being edited. It is a statement about the
 * author's habit, not about that particular night, and a per-day window would
 * also run off the end of what the screen read.
 */
export function buildDayDefaults({
  rows,
  dayKey,
  todayKey,
  timeZone,
  targetMin,
  nowMin,
}: {
  rows: SleepLogRow[];
  /** `YYYY-MM-DD` of the day the form is about. */
  dayKey: string;
  todayKey: string;
  timeZone: string;
  targetMin: number;
  /** From `roundedNowMin`, resolved on the server. */
  nowMin: number;
}): SleepEntryDefaults {
  const existing = rows.find((row) => row.localDate === dayKey);

  if (existing) {
    return {
      localDate: dayKey,
      bedClock: minutesToClock(
        localClockMinutes(new Date(existing.bedAt), timeZone)
      ),
      wakeClock: minutesToClock(
        localClockMinutes(new Date(existing.wakeAt), timeZone)
      ),
      quality: existing.quality,
      latencyMin: existing.latencyMin,
      awakeningsMin: existing.awakeningsMin,
      factors: existing.factors,
      isFreeDay: existing.isFreeDay,
      note: existing.note,
    };
  }

  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const sampleFrom = localDateKey(addDays(today, -(MEDIAN_SAMPLE_DAYS - 1)));
  const recentBedtimes = rows
    .filter((row) => row.localDate >= sampleFrom)
    .map((row) => row.bedAt);

  const bedClock =
    medianBedClock(recentBedtimes, timeZone) ?? FALLBACK_BED_CLOCK;
  const bedMin = clockToMinutes(bedClock) ?? 0;

  // The short way round, the same rule the form itself uses for the duration
  // it displays — so this test and that figure can never disagree.
  const candidateNightMin = (((nowMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  const wakeMin =
    dayKey === todayKey && candidateNightMin >= MIN_PLAUSIBLE_NIGHT_MIN
      ? nowMin
      : bedMin + targetMin;

  const day = new Date(`${dayKey}T00:00:00.000Z`);

  return {
    localDate: dayKey,
    bedClock,
    wakeClock: minutesToClock(wakeMin),
    quality: null,
    latencyMin: null,
    awakeningsMin: null,
    factors: [],
    // Saturday or Sunday, of the day being edited rather than of today. The
    // key is UTC midnight standing for a calendar day, so its UTC weekday IS
    // the local one. A guess, and shown as a checkbox precisely because
    // holidays and shift work break it.
    isFreeDay: day.getUTCDay() === 0 || day.getUTCDay() === 6,
    note: null,
  };
}
