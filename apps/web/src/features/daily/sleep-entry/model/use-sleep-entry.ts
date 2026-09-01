'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { type SleepFactor, upsertSleepLog } from '@/entities/sleep-log';
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

/** The block the "same as usual" card offers in one tap. Null when the last
 *  fortnight holds no night to derive it from — a suggestion built from no
 *  history is a guess wearing the word "usual". */
export interface SleepSuggestion {
  bedClock: string;
  wakeClock: string;
  latencyMin: number | null;
  awakeningsMin: number | null;
}

/** What the screen knows and the form starts from. Every field is derived from
 *  values the SERVER resolved — the row set, the time zone, and the clock as a
 *  plain number — so the first client render matches the SSR output exactly. */
export interface SleepEntryDefaults {
  /** `YYYY-MM-DD` of the night this form is about. */
  localDate: string;
  /** Empty unless a row exists. The fortnight's habit arrives as `suggestion`
   *  instead, because a pre-filled clock is an answer nobody gave. */
  bedClock: string;
  wakeClock: string;
  quality: number | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  factors: string[];
  isFreeDay: boolean;
  note: string | null;
  suggestion: SleepSuggestion | null;
}

/** Everything one night's write needs, as the form holds it. */
interface NightValues {
  bedClock: string;
  wakeClock: string;
  quality: number | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  factors: string[];
  isFreeDay: boolean;
  note: string | null;
}

/** Why this night cannot be written, or merely why it looks wrong. Blocking
 *  issues disable Save; a flag is shown and saved through. */
export interface NightIssue {
  message: string;
  blocking: boolean;
}

/**
 * The morning form's state and its one write.
 *
 * A night is stored as two INSTANTS, but a person entering one knows two clock
 * times and which morning it is, so the conversion runs at submit rather than
 * on every keystroke: a form left open across midnight saves against the day
 * it was submitted.
 *
 * Bedtime resolves to the LAST occurrence of that clock before waking, which
 * is what lands 23:40 on yesterday evening and 00:20 on this morning without
 * asking which was meant.
 *
 * **Which day gets written is decided by WHERE THE WAKE INSTANT LANDS.**
 * `upsertSleepLog` derives `localDate` from `wakeAt` and refuses to take a day
 * from the client — the column both health domains join on must not be under
 * the caller's control. Editing a past night therefore means placing the wake
 * clock on that day's local midnight, not naming a different day.
 *
 * `timeZone` is read from the device at submit, not from the server render:
 * the screen's zone comes from a geo header and is a good guess, the device's
 * is the fact, and it is the zone the stored `local_date` is resolved with.
 */
export function useSleepEntry(defaults: SleepEntryDefaults) {
  const t = useTranslations('dashboard.daily');

  const [bedClock, setBedClock] = useState(defaults.bedClock);
  const [wakeClock, setWakeClock] = useState(defaults.wakeClock);
  const [quality, setQuality] = useState<number | null>(defaults.quality);
  const [latency, setLatency] = useState<number | null>(defaults.latencyMin);
  const [awakenings, setAwakenings] = useState<number | null>(
    defaults.awakeningsMin
  );
  const [factors, setFactors] = useState<string[]>(defaults.factors);
  const [isFreeDay, setIsFreeDay] = useState(defaults.isFreeDay);
  const [note, setNote] = useState(defaults.note ?? '');

  // What a repair rewrote, so the notice can offer the typed value back — and
  // so putting it back does not get repaired a second time on the next blur,
  // which would make an unusual-but-real night impossible to enter.
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
  // when either clock is empty, zero when they are equal — both block the save
  // rather than sending a night the server would reject anyway.
  const durationMin =
    bedMin === null || wakeMin === null
      ? null
      : (((wakeMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  const isDirty =
    bedClock !== defaults.bedClock ||
    wakeClock !== defaults.wakeClock ||
    quality !== defaults.quality ||
    latency !== defaults.latencyMin ||
    awakenings !== defaults.awakeningsMin ||
    isFreeDay !== defaults.isFreeDay ||
    note !== (defaults.note ?? '') ||
    factors.length !== defaults.factors.length ||
    factors.some((factor) => !defaults.factors.includes(factor));

  // Shown on the clocks, not only as a greyed-out button two screens away.
  // Silent while an unlogged day is still untouched: the sheet OPENS on that
  // state, and an error before the first keystroke is noise, not a warning.
  // The long-night case is a FLAG, not a block — fourteen hours in bed is
  // unusual, and it is also what an ill night looks like.
  const untouchedBlank = !isDirty && bedClock === '' && wakeClock === '';
  let nightIssue: NightIssue | null = null;
  if (untouchedBlank) {
    nightIssue = null;
  } else if (durationMin === null) {
    nightIssue = { message: t('sleep.durationPending'), blocking: true };
  } else if (durationMin === 0) {
    nightIssue = { message: t('sleep.clocksEqual'), blocking: true };
  } else if (durationMin >= LONG_NIGHT_MIN) {
    nightIssue = {
      message: t('sleep.longNight', splitMinutes(durationMin)),
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
  // correcting mid-entry would rewrite 19:00 to 07:00 before the reader had
  // typed the minutes they were heading for.
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

  // Only while both clocks are untouched. Accepting fills them, which is what
  // retires the card — so it reads as an offer right up until it is taken.
  const suggestion =
    bedClock === '' && wakeClock === '' ? defaults.suggestion : null;

  const acceptSuggestion = useCallback(() => {
    if (defaults.suggestion === null) return;

    setBedClock(defaults.suggestion.bedClock);
    setWakeClock(defaults.suggestion.wakeClock);
    setLatency(defaults.suggestion.latencyMin);
    setAwakenings(defaults.suggestion.awakeningsMin);
    setRepairedFrom(null);
  }, [defaults.suggestion]);

  const current: NightValues = {
    bedClock,
    wakeClock,
    quality,
    latencyMin: latency,
    awakeningsMin: awakenings,
    factors,
    isFreeDay,
    note: note.trim() === '' ? null : note.trim(),
  };

  const mutation = useMutation({
    mutationFn: () => writeNight(current, defaults.localDate, t('errors.save')),
    // No toast, no refresh, no invalidation here. This is one of two writes the
    // day sheet makes and the sheet owns the feedback for both.
  });

  // Not a mutation and deliberately state-free: the sheet is already unmounted
  // by the time the undo toast is tapped, so this has to be a plain closure.
  const restoreAsync = useCallback(
    () =>
      writeNight(
        {
          bedClock: defaults.bedClock,
          wakeClock: defaults.wakeClock,
          quality: defaults.quality,
          latencyMin: defaults.latencyMin,
          awakeningsMin: defaults.awakeningsMin,
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
    quality,
    setQuality,
    latency,
    setLatency,
    awakenings,
    setAwakenings,
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
    nightIssue,
    // Not derived from `nightIssue`, which stays quiet on an untouched blank
    // day: a night still cannot be WRITTEN without two usable clocks, and the
    // caller only consults this when it has decided to write one.
    canSave:
      durationMin !== null && durationMin !== 0 && !mutation.isPending,
    isSaving: mutation.isPending,
    // Load-bearing twice over: the modal writes the sleep half only when this
    // is true or a row already exists, and the dismiss guard reads it to
    // decide whether closing the sheet would lose anything.
    isDirty,
    /** For a caller that has to sequence this write against another one. */
    saveAsync: () => mutation.mutateAsync(),
    restoreAsync,
  };
}

/** One night, from two clock times to two instants and a write. Shared by the
 *  save and by the undo, so the two can never disagree about which instant a
 *  clock time meant. */
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

  if (wakeMin === null || durationMin === null || durationMin === 0) {
    throw new Error(invalidMessage);
  }

  const wakeAt = atLocalClock(localMidnight(localDate), wakeMin);
  const bedAt = new Date(wakeAt.getTime() - durationMin * 60_000);

  const res = await upsertSleepLog({
    bedAt: bedAt.toISOString(),
    wakeAt: wakeAt.toISOString(),
    latencyMin: values.latencyMin,
    awakeningsMin: values.awakeningsMin,
    quality: values.quality,
    note: values.note,
    isFreeDay: values.isFreeDay,
    factors: values.factors,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  if (!res.success) throw new Error(res.errorMsg);

  return res.data;
}

/**
 * A `YYYY-MM-DD` key as midnight in the DEVICE's zone.
 *
 * Not `new Date(key)`, which parses a bare date as UTC and lands on the
 * previous day for every reader west of Greenwich — the one bug the whole
 * `localDate` convention exists to avoid.
 */
function localMidnight(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);

  return new Date(year, month - 1, day);
}

/** A day, at a clock time, in the DEVICE's zone — the same zone whose name is
 *  sent alongside, so the instant and the zone cannot disagree. */
function atLocalClock(base: Date, minutes: number): Date {
  const out = new Date(base);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(minutes);

  return out;
}
