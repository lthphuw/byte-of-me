import { localClockMinutes, medianBedClock, medianOf } from './median-bed-clock';

import {
  NAP_BUCKETS,
  type NapBucket,
  type SleepLogRow,
} from '@/entities/sleep-log';
import {
  RISE_OFFSET_PRESETS,
  type SleepEntryDefaults,
  type SleepSuggestion,
} from '@/features/daily/sleep-entry/model/use-sleep-entry';
import { clockToMinutes, minutesToClock } from '@/shared/lib/health/duration';
import { addDays, localDateKey } from '@/shared/lib/health/local-date';

/** Bedtimes older than the summary window say nothing about what "as usual"
 *  means today. */
const MEDIAN_SAMPLE_DAYS = 14;

/** Below this, "now" cannot plausibly be the end of the night the form is
 *  about. See `buildSuggestion`. */
const MIN_PLAUSIBLE_NIGHT_MIN = 240;

const DAY_MIN = 1440;

/** Minutes past local midnight, rounded to the input's five-minute step. On
 *  the SERVER, once: `new Date()` in the browser hydrates with a mismatch. */
export function roundedNowMin(now: Date, timeZone: string): number {
  return Math.round(localClockMinutes(now, timeZone) / 5) * 5;
}

/**
 * What the form opens showing, for ANY day the calendar can select.
 *
 * A stored row wins outright — the write is an upsert, so a second open is an
 * EDIT and a blank form would offer to overwrite a saved night. Otherwise the
 * clocks open EMPTY, with the fortnight's habit beside them as a suggestion.
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
      ...riseDefaults(existing, timeZone),
      quality: existing.quality,
      restedness: existing.restedness,
      latencyMin: existing.latencyMin,
      awakeningsMin: existing.awakeningsMin,
      awakeningsCount: existing.awakeningsCount,
      napBucket: asNapBucket(existing.napBucket),
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
    // Selected, not unanswered: unlike a pre-filled clock this is a visible
    // chip, and it keeps efficiency computable on a one-tap morning.
    riseOffsetMin: 0,
    riseClockCustom: '',
    quality: null,
    restedness: null,
    latencyMin: null,
    awakeningsMin: null,
    awakeningsCount: null,
    napBucket: null,
    factors: [],
    // The key is UTC midnight standing for a calendar day, so its UTC weekday
    // IS the local one. A guess — hence a checkbox, for holidays and shifts.
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
 * The last fortnight's habit, or null. Medians, never means — one night out
 * until 04:00 drags an average and is then offered back as the new normal.
 * RESTEDNESS IS ABSENT: it is the outcome, and must be observed, not offered.
 *
 * The wake time is "now" only when now is plausibly the END of that night;
 * opened at 23:10 against a 23:00 median it once suggested a ten-minute
 * night. Otherwise, and always for a past day, it is bedtime plus the target.
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
  // The short way round, the rule the form's own duration uses.
  const candidateNightMin = (((nowMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const wakeMin =
    dayKey === todayKey && candidateNightMin >= MIN_PLAUSIBLE_NIGHT_MIN
      ? nowMin
      : bedMin + targetMin;

  const recorded = <T,>(values: (T | null)[]): T[] =>
    values.filter((value): value is T => value !== null);

  return {
    bedClock,
    wakeClock: minutesToClock(wakeMin),
    riseOffsetMin:
      medianOf(recorded(recent.map((row) => riseGapOf(row)))) ?? 0,
    latencyMin: medianOf(recorded(recent.map((row) => row.latencyMin))),
    awakeningsMin: medianOf(recorded(recent.map((row) => row.awakeningsMin))),
    awakeningsCount: medianOf(
      recorded(recent.map((row) => row.awakeningsCount))
    ),
    napBucket: medianNapBucket(recent),
  };
}

/** Waking to getting up, or null when the row predates the column. The short
 *  way round, like every other span here. */
function riseGapOf(row: SleepLogRow): number | null {
  if (row.riseAt === null) return null;

  const gapMin = Math.round(
    (new Date(row.riseAt).getTime() - new Date(row.wakeAt).getTime()) / 60_000
  );

  return ((gapMin % DAY_MIN) + DAY_MIN) % DAY_MIN;
}

/** The middle nap ANSWER, by position in the ordered id list. A median over
 *  indices, not a mean over minutes: the ids are ordered but not evenly
 *  spaced, and `gt60` has no upper bound to average. */
function medianNapBucket(rows: SleepLogRow[]): NapBucket | null {
  const indices = rows
    .map((row) => NAP_BUCKETS.indexOf(asNapBucket(row.napBucket) as NapBucket))
    .filter((index) => index >= 0);

  const median = medianOf(indices);

  return median === null ? null : NAP_BUCKETS[median];
}

/** A retired id reads as unanswered rather than crashing. */
function asNapBucket(value: string | null): NapBucket | null {
  return NAP_BUCKETS.includes(value as NapBucket) ? (value as NapBucket) : null;
}

/** Which rise control an existing row opens on. An off-preset gap opens the
 *  custom clock holding the real value, so re-saving never rounds the
 *  author's own answer to the nearest chip. */
function riseDefaults(
  row: SleepLogRow,
  timeZone: string
): Pick<SleepEntryDefaults, 'riseOffsetMin' | 'riseClockCustom'> {
  const gapMin = riseGapOf(row);
  if (row.riseAt === null || gapMin === null) {
    return { riseOffsetMin: 0, riseClockCustom: '' };
  }

  if ((RISE_OFFSET_PRESETS as readonly number[]).includes(gapMin)) {
    return { riseOffsetMin: gapMin, riseClockCustom: '' };
  }

  return {
    riseOffsetMin: null,
    riseClockCustom: minutesToClock(
      localClockMinutes(new Date(row.riseAt), timeZone)
    ),
  };
}
