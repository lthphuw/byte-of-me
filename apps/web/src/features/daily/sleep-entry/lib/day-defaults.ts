import { localClockMinutes, medianBedClock, medianOf } from './median-bed-clock';

import type { SleepLogRow } from '@/entities/sleep-log';
import type {
  SleepEntryDefaults,
  SleepSuggestion,
} from '@/features/daily/sleep-entry/model/use-sleep-entry';
import { clockToMinutes, minutesToClock } from '@/shared/lib/health/duration';
import { addDays, localDateKey } from '@/shared/lib/health/local-date';

/** Bedtimes older than the summary window say nothing about what "as usual"
 *  means today. */
const MEDIAN_SAMPLE_DAYS = 14;

/**
 * Below this, "now" cannot plausibly be the end of the night the form is
 * about. See `buildDayDefaults`.
 */
const MIN_PLAUSIBLE_NIGHT_MIN = 240;

const DAY_MIN = 1440;

/**
 * Minutes past local midnight, rounded to the five the time input steps in.
 *
 * Split out so the SERVER resolves it once and hands it to the form: a clock
 * read from `new Date()` in the browser would differ from the one the server
 * rendered and hydrate with a mismatch.
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
 * Otherwise the clocks open EMPTY and the fortnight's habit is offered beside
 * them as a suggestion. They used to arrive pre-filled, which read as an
 * answer the author had given and was defended by a dirty check nobody could
 * see; one tap on an accept-or-edit card is the same keystroke count and says
 * out loud where the numbers came from.
 *
 * The suggested wake time is "now, rounded to five minutes" ONLY WHEN NOW IS
 * PLAUSIBLY THE END OF THAT NIGHT. Unconditionally it produced the worst first
 * impression this screen could give: opened at 23:10 against a 23:00 median
 * bedtime it suggested a ten-minute night. Under four hours — a length, not an
 * hour of the day, so a shift worker gets the same sensible answer — means the
 * night has not happened yet, and the honest guess is bedtime plus the nightly
 * target. A PAST day takes that branch unconditionally: no clock reading
 * describes a night that ended days ago.
 *
 * The window is the SAME fortnight for every day rather than the fortnight
 * before the day being edited. It is a statement about the author's habit, not
 * about that particular night.
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
  const day = new Date(`${dayKey}T00:00:00.000Z`);

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
      suggestion: null,
    };
  }

  return {
    localDate: dayKey,
    bedClock: '',
    wakeClock: '',
    quality: null,
    latencyMin: null,
    awakeningsMin: null,
    factors: [],
    // Saturday or Sunday of the day being edited. The key is UTC midnight
    // standing for a calendar day, so its UTC weekday IS the local one. A
    // guess, and a checkbox precisely because holidays and shift work break it.
    isFreeDay: day.getUTCDay() === 0 || day.getUTCDay() === 6,
    note: null,
    suggestion: buildSuggestion({
      rows,
      dayKey,
      todayKey,
      timeZone,
      targetMin,
      nowMin,
    }),
  };
}

/**
 * The last fortnight's habit, or null when there is none to describe.
 *
 * Every figure is a median, never a mean: one night out until 04:00 drags an
 * average by half an hour and would then be offered back as the new normal.
 * Latency and minutes awake are carried only when they were actually recorded
 * — a bucket the author never answered is not part of "as usual".
 */
function buildSuggestion({
  rows,
  dayKey,
  todayKey,
  timeZone,
  targetMin,
  nowMin,
}: {
  rows: SleepLogRow[];
  dayKey: string;
  todayKey: string;
  timeZone: string;
  targetMin: number;
  nowMin: number;
}): SleepSuggestion | null {
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const sampleFrom = localDateKey(addDays(today, -(MEDIAN_SAMPLE_DAYS - 1)));
  const recent = rows.filter((row) => row.localDate >= sampleFrom);

  const bedClock = medianBedClock(
    recent.map((row) => row.bedAt),
    timeZone
  );
  if (bedClock === null) return null;

  const bedMin = clockToMinutes(bedClock) ?? 0;
  // The short way round, the same rule the form uses for the duration it
  // shows — so this test and that figure can never disagree.
  const candidateNightMin = (((nowMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const wakeMin =
    dayKey === todayKey && candidateNightMin >= MIN_PLAUSIBLE_NIGHT_MIN
      ? nowMin
      : bedMin + targetMin;

  return {
    bedClock,
    wakeClock: minutesToClock(wakeMin),
    latencyMin: medianOf(
      recent
        .map((row) => row.latencyMin)
        .filter((value): value is number => value !== null)
    ),
    awakeningsMin: medianOf(
      recent
        .map((row) => row.awakeningsMin)
        .filter((value): value is number => value !== null)
    ),
  };
}
