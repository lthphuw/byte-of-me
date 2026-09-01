'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  type NapBucket,
  type SleepFactor,
  upsertSleepLog,
} from '@/entities/sleep-log';
import {
  LONG_NIGHT_MIN,
  repairNight,
} from '@/features/daily/sleep-entry/lib/night-repair';
import {
  clockToMinutes,
  minutesToClock,
  splitMinutes,
} from '@/shared/lib/health/duration';

const DAY_MIN = 1440;

/** What the "same as usual" card offers in one tap. Null when the fortnight
 *  holds no night — a suggestion from no history is a guess wearing the
 *  word "usual". */
export interface SleepSuggestion {
  bedClock: string;
  wakeClock: string;
  /** Waking to getting up. Never null: 0 is both the commonest answer and
   *  the one that changes no figure. */
  riseOffsetMin: number;
  latencyMin: number | null;
  awakeningsMin: number | null;
  awakeningsCount: number | null;
  napBucket: NapBucket | null;
}

/** Offsets applied to the wake time — not a `SleepBucket` table, which holds
 *  ranges a stored value falls into. */
export const RISE_OFFSET_PRESETS = [0, 15, 30] as const;

/** Past this, a custom out-of-bed clock reads as BEFORE waking rather than a
 *  very long lie-in — the gap is measured the short way round. */
const MAX_RISE_GAP_MIN = 720;

/** What the form starts from. Every field is derived from values the SERVER
 *  resolved, so the first client render matches the SSR output exactly. */
export interface SleepEntryDefaults {
  /** `YYYY-MM-DD` of the night this form is about. */
  localDate: string;
  /** Empty unless a row exists — the habit arrives as `suggestion` instead,
   *  because a pre-filled clock is an answer nobody gave. */
  bedClock: string;
  wakeClock: string;
  /** Null when the stored value is off-preset and `riseClockCustom` holds
   *  it instead. */
  riseOffsetMin: number | null;
  riseClockCustom: string;
  quality: number | null;
  restedness: number | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  awakeningsCount: number | null;
  napBucket: NapBucket | null;
  factors: string[];
  isFreeDay: boolean;
  note: string | null;
  suggestion: SleepSuggestion | null;
}

/** Everything one night's write needs, as the form holds it. */
interface NightValues {
  bedClock: string;
  wakeClock: string;
  /** Null only when the clocks are unusable, which blocks the write. */
  riseGapMin: number | null;
  quality: number | null;
  restedness: number | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  awakeningsCount: number | null;
  napBucket: NapBucket | null;
  factors: string[];
  isFreeDay: boolean;
  note: string | null;
}

/** Why the night cannot be written, or merely why it looks wrong. Blocking
 *  disables Save; a flag is shown and saved through. */
export interface NightIssue {
  message: string;
  blocking: boolean;
}

/**
 * The morning form's state and its one write. Clocks become INSTANTS at
 * submit, not per keystroke, and bedtime resolves to the LAST occurrence
 * before waking — so 23:40 lands yesterday and 00:20 lands this morning.
 *
 * **Which day gets written is decided by WHERE THE WAKE INSTANT LANDS.**
 * `upsertSleepLog` derives `localDate` from `wakeAt` and takes no day from
 * the client; `timeZone` comes from the DEVICE at submit, not the render.
 */
export function useSleepEntry(defaults: SleepEntryDefaults) {
  const t = useTranslations('dashboard.daily');

  const [bedClock, setBedClock] = useState(defaults.bedClock);
  const [wakeClock, setWakeClock] = useState(defaults.wakeClock);
  const [riseOffsetMin, setRiseOffsetMin] = useState<number | null>(
    defaults.riseOffsetMin
  );
  const [riseClockCustom, setRiseClockCustom] = useState(
    defaults.riseClockCustom
  );
  const [quality, setQuality] = useState<number | null>(defaults.quality);
  const [restedness, setRestedness] = useState<number | null>(
    defaults.restedness
  );
  const [latency, setLatency] = useState<number | null>(defaults.latencyMin);
  const [awakenings, setAwakenings] = useState<number | null>(
    defaults.awakeningsMin
  );
  const [awakeningsCount, setAwakeningsCount] = useState<number | null>(
    defaults.awakeningsCount
  );
  const [napBucket, setNapBucket] = useState<NapBucket | null>(
    defaults.napBucket
  );
  const [factors, setFactors] = useState<string[]>(defaults.factors);
  const [isFreeDay, setIsFreeDay] = useState(defaults.isFreeDay);
  const [note, setNote] = useState(defaults.note ?? '');

  // What a repair rewrote, so the notice can offer the typed value back —
  // and so putting it back is not repaired again on the next blur.
  const [repairedFrom, setRepairedFrom] = useState<{
    field: 'bed' | 'wake';
    from: string;
    to: string;
  } | null>(null);
  const keptRef = useRef<{ bed: string | null; wake: string | null }>({
    bed: null,
    wake: null,
  });

  const bedMin = clockToMinutes(bedClock);
  const wakeMin = clockToMinutes(wakeClock);

  // Modulo, so a night crossing midnight measures the short way round. Null
  // on an empty clock, zero on an equal pair; both block the save.
  const durationMin =
    bedMin === null || wakeMin === null
      ? null
      : (((wakeMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  // A preset TRACKS the wake clock rather than freezing a value: editing the
  // wake time after "+15m" must move getting up with it.
  const customRiseMin = clockToMinutes(riseClockCustom);
  const riseMin =
    riseOffsetMin !== null
      ? wakeMin === null
        ? null
        : (wakeMin + riseOffsetMin) % DAY_MIN
      : customRiseMin;

  // The short way round, so a custom clock BEFORE waking shows up as an
  // implausibly large gap — what `MAX_RISE_GAP_MIN` catches.
  const riseGapMin =
    riseMin === null || wakeMin === null
      ? null
      : (((riseMin - wakeMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  const riseClock =
    riseMin === null ? riseClockCustom : minutesToClock(riseMin);

  // TIB, what efficiency is measured against: it ends when you get UP, not
  // when you wake. `sleep-stats.ts` computes the same thing server-side.
  const timeInBedMin =
    durationMin === null || riseGapMin === null
      ? null
      : durationMin + riseGapMin;

  const isDirty =
    bedClock !== defaults.bedClock ||
    wakeClock !== defaults.wakeClock ||
    riseOffsetMin !== defaults.riseOffsetMin ||
    riseClockCustom !== defaults.riseClockCustom ||
    quality !== defaults.quality ||
    restedness !== defaults.restedness ||
    latency !== defaults.latencyMin ||
    awakenings !== defaults.awakeningsMin ||
    awakeningsCount !== defaults.awakeningsCount ||
    napBucket !== defaults.napBucket ||
    isFreeDay !== defaults.isFreeDay ||
    note !== (defaults.note ?? '') ||
    factors.length !== defaults.factors.length ||
    factors.some((factor) => !defaults.factors.includes(factor));

  // Silent on an untouched blank day — the sheet OPENS on that state, and an
  // error before the first keystroke is noise. The long night is a FLAG, not
  // a block: fourteen hours in bed is also what an ill night looks like.
  const untouchedBlank = !isDirty && bedClock === '' && wakeClock === '';
  let nightIssue: NightIssue | null = null;
  if (untouchedBlank) {
    nightIssue = null;
  } else if (durationMin === null) {
    nightIssue = { message: t('sleep.durationPending'), blocking: true };
  } else if (durationMin === 0) {
    nightIssue = { message: t('sleep.clocksEqual'), blocking: true };
  } else if (riseGapMin !== null && riseGapMin > MAX_RISE_GAP_MIN) {
    nightIssue = { message: t('sleep.riseBeforeWake'), blocking: true };
  } else if (timeInBedMin !== null && timeInBedMin >= LONG_NIGHT_MIN) {
    nightIssue = {
      message: t('sleep.longNight', splitMinutes(timeInBedMin)),
      blocking: false,
    };
  }

  const changeBedClock = useCallback((value: string) => {
    setRepairedFrom(null);
    setBedClock(value);
  }, []);

  const changeWakeClock = useCallback((value: string) => {
    setRepairedFrom(null);
    setWakeClock(value);
  }, []);

  // On blur, never on change: a native time input reports each keystroke, so
  // correcting mid-entry rewrites 19:00 to 07:00 before the minutes arrive.
  const repairClocks = useCallback(() => {
    if (bedMin === null || wakeMin === null) return;

    const fix = repairNight(bedMin, wakeMin);
    if (fix === null) return;

    const from = fix.field === 'bed' ? bedClock : wakeClock;
    if (keptRef.current[fix.field] === from) return;

    const to = minutesToClock(fix.corrected);
    if (fix.field === 'bed') setBedClock(to);
    else setWakeClock(to);
    setRepairedFrom({ field: fix.field, from, to });
  }, [bedClock, wakeClock, bedMin, wakeMin]);

  const undoRepair = useCallback(() => {
    if (repairedFrom === null) return;

    keptRef.current[repairedFrom.field] = repairedFrom.from;
    if (repairedFrom.field === 'bed') setBedClock(repairedFrom.from);
    else setWakeClock(repairedFrom.from);
    setRepairedFrom(null);
  }, [repairedFrom]);

  // Only while both clocks are empty; accepting fills them, which retires
  // the card.
  const suggestion =
    bedClock === '' && wakeClock === '' ? defaults.suggestion : null;

  const acceptSuggestion = useCallback(() => {
    if (defaults.suggestion === null) return;

    setBedClock(defaults.suggestion.bedClock);
    setWakeClock(defaults.suggestion.wakeClock);
    setRiseOffsetMin(defaults.suggestion.riseOffsetMin);
    setRiseClockCustom('');
    setLatency(defaults.suggestion.latencyMin);
    setAwakenings(defaults.suggestion.awakeningsMin);
    setAwakeningsCount(defaults.suggestion.awakeningsCount);
    setNapBucket(defaults.suggestion.napBucket);
    setRepairedFrom(null);
  }, [defaults.suggestion]);

  const current: NightValues = {
    bedClock,
    wakeClock,
    riseGapMin,
    quality,
    restedness,
    latencyMin: latency,
    awakeningsMin: awakenings,
    awakeningsCount,
    napBucket,
    factors,
    isFreeDay,
    note: note.trim() === '' ? null : note.trim(),
  };

  const mutation = useMutation({
    mutationFn: () => writeNight(current, defaults.localDate, t('errors.save')),
    // No toast, no refresh, no invalidation: this is one of two writes the
    // day sheet makes, and the sheet owns the feedback for both.
  });

  // Deliberately state-free: the sheet is unmounted by the time the undo
  // toast is tapped, so this must be a plain closure.
  const restoreAsync = useCallback(
    () =>
      writeNight(
        {
          bedClock: defaults.bedClock,
          wakeClock: defaults.wakeClock,
          riseGapMin: defaultRiseGapMin(defaults),
          quality: defaults.quality,
          restedness: defaults.restedness,
          latencyMin: defaults.latencyMin,
          awakeningsMin: defaults.awakeningsMin,
          awakeningsCount: defaults.awakeningsCount,
          napBucket: defaults.napBucket,
          factors: defaults.factors,
          isFreeDay: defaults.isFreeDay,
          note: defaults.note,
        },
        defaults.localDate,
        t('errors.save')
      ),
    [defaults, t]
  );

  return {
    bedClock,
    setBedClock: changeBedClock,
    wakeClock,
    setWakeClock: changeWakeClock,
    repairClocks,
    repairedFrom,
    undoRepair,
    suggestion,
    acceptSuggestion,
    riseOffsetMin,
    setRiseOffsetMin,
    riseClock,
    riseClockCustom,
    setRiseClockCustom,
    quality,
    setQuality,
    restedness,
    setRestedness,
    latency,
    setLatency,
    awakenings,
    setAwakenings,
    awakeningsCount,
    setAwakeningsCount,
    napBucket,
    setNapBucket,
    factors,
    toggleFactor: (factor: SleepFactor) =>
      setFactors((current) =>
        current.includes(factor)
          ? current.filter((f) => f !== factor)
          : [...current, factor]
      ),
    isFreeDay,
    setIsFreeDay,
    note,
    setNote,
    durationMin,
    timeInBedMin,
    nightIssue,
    // Not derived from `nightIssue`, which stays quiet on an untouched blank
    // day — a night still cannot be WRITTEN without two usable clocks.
    canSave:
      durationMin !== null &&
      durationMin !== 0 &&
      riseGapMin !== null &&
      riseGapMin <= MAX_RISE_GAP_MIN &&
      !mutation.isPending,
    isSaving: mutation.isPending,
    // Read twice: the modal writes the sleep half only when this is true or
    // a row exists, and the dismiss guard asks it what closing would lose.
    isDirty,
    /** For a caller that has to sequence this write against another one. */
    saveAsync: () => mutation.mutateAsync(),
    restoreAsync,
  };
}

/** The rise gap the sheet OPENED with, for the undo write. Recomputed, not
 *  stored: undo restores the wake clock too, and a frozen gap would be
 *  measured against the wrong one. */
function defaultRiseGapMin(defaults: SleepEntryDefaults): number | null {
  if (defaults.riseOffsetMin !== null) return defaults.riseOffsetMin;

  const wakeMin = clockToMinutes(defaults.wakeClock);
  const riseMin = clockToMinutes(defaults.riseClockCustom);
  if (wakeMin === null || riseMin === null) return null;

  return (((riseMin - wakeMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;
}

/** Two clock times to two instants and a write. Shared by save and undo, so
 *  they cannot disagree about what a clock time meant. */
async function writeNight(
  values: NightValues,
  localDate: string,
  invalidMessage: string
) {
  const bedMin = clockToMinutes(values.bedClock);
  const wakeMin = clockToMinutes(values.wakeClock);
  const durationMin =
    bedMin === null || wakeMin === null
      ? null
      : (((wakeMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  if (
    wakeMin === null ||
    durationMin === null ||
    durationMin === 0 ||
    values.riseGapMin === null
  ) {
    throw new Error(invalidMessage);
  }

  const wakeAt = atLocalClock(localMidnight(localDate), wakeMin);
  const bedAt = new Date(wakeAt.getTime() - durationMin * 60_000);
  // The wake INSTANT plus a gap, never a second clock resolved on its own —
  // that lands on the wrong day whenever getting up crosses midnight.
  const riseAt = new Date(wakeAt.getTime() + values.riseGapMin * 60_000);

  const res = await upsertSleepLog({
    bedAt: bedAt.toISOString(),
    wakeAt: wakeAt.toISOString(),
    riseAt: riseAt.toISOString(),
    latencyMin: values.latencyMin,
    awakeningsMin: values.awakeningsMin,
    awakeningsCount: values.awakeningsCount,
    quality: values.quality,
    restedness: values.restedness,
    napBucket: values.napBucket,
    note: values.note,
    isFreeDay: values.isFreeDay,
    factors: values.factors,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  if (!res.success) throw new Error(res.errorMsg);

  return res.data;
}

/** A `YYYY-MM-DD` key as midnight in the DEVICE's zone. Not `new Date(key)`,
 *  which parses a bare date as UTC and lands a day early west of Greenwich —
 *  the bug the whole `localDate` convention exists to avoid. */
function localMidnight(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);

  return new Date(year, month - 1, day);
}

/** A day at a clock time in the DEVICE's zone — the same zone sent alongside,
 *  so the instant and its name cannot disagree. */
function atLocalClock(base: Date, minutes: number): Date {
  const out = new Date(base);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(minutes);

  return out;
}
