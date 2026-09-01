'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { type SleepFactor, upsertSleepLog } from '@/entities/sleep-log';
import { clockToMinutes } from '@/shared/lib/health/duration';

const DAY_MIN = 1440;

/** What the screen knows and the form starts from. Every field is derived from
 *  values the SERVER resolved — the row set, the time zone, and the clock as a
 *  plain number — so the first client render matches the SSR output exactly
 *  and nothing has to be filled in after mount. */
export interface SleepEntryDefaults {
  /** `YYYY-MM-DD` of the night this form is about. The calendar chooses it;
   *  everything below describes that day. */
  localDate: string;
  bedClock: string;
  wakeClock: string;
  quality: number | null;
  latencyMin: number | null;
  awakeningsMin: number | null;
  factors: string[];
  isFreeDay: boolean;
  note: string | null;
}

/**
 * The morning form's state and its one write.
 *
 * The two clocks are the whole model. A night is stored as two INSTANTS, but a
 * person entering one knows two clock times and which morning it is, so the
 * conversion belongs here and runs at submit rather than on every keystroke:
 * a form left open across midnight then saves against the day it was
 * submitted, not the day it was opened.
 *
 * Bedtime resolves to the LAST occurrence of that clock time before waking.
 * That single rule is what makes 23:40 land on yesterday evening and 00:20 on
 * this morning without asking the author which they meant — and both then
 * carry the same `localDate`, because the server derives it from `wakeAt`.
 *
 * **Which day gets written is decided by WHERE THE WAKE INSTANT LANDS.**
 * `upsertSleepLog` derives `localDate` from `wakeAt` and refuses to take a day
 * from the client, deliberately: the column both health domains join on must
 * not be under the caller's control. So editing a past night is not a matter
 * of naming a different day — the form places the wake clock on that day's
 * local midnight instead of today's, and the server's own rule then resolves
 * it to exactly that day. The guarantee is untouched, and no entity had to
 * change to make the calendar editable.
 *
 * `timeZone` is read from the device at submit, not from the server render.
 * The screen's zone comes from a geo header and is a good guess; the device's
 * is the fact, and it is the value the stored `local_date` is resolved with.
 * It is also the zone `atLocalClock` builds the instant in, so the day the
 * client aimed at and the day the server derives cannot disagree.
 */
export function useSleepEntry(defaults: SleepEntryDefaults) {
  const t = useTranslations('dashboard.daily');

  const [bedClock, setBedClock] = useState(defaults.bedClock);
  const [wakeClock, setWakeClock] = useState(defaults.wakeClock);
  const [quality, setQuality] = useState<number | null>(defaults.quality);
  const [latency, setLatency] = useState(numberToField(defaults.latencyMin));
  const [awakenings, setAwakenings] = useState(
    numberToField(defaults.awakeningsMin)
  );
  const [factors, setFactors] = useState<string[]>(defaults.factors);
  const [isFreeDay, setIsFreeDay] = useState(defaults.isFreeDay);
  const [note, setNote] = useState(defaults.note ?? '');

  const bedMin = clockToMinutes(bedClock);
  const wakeMin = clockToMinutes(wakeClock);

  // Modulo, so the duration of a night that crosses midnight is the short way
  // round. Null when either clock is empty, and zero when they are equal —
  // both of which block the save rather than sending a zero-length night the
  // server would reject anyway.
  const durationMin =
    bedMin === null || wakeMin === null
      ? null
      : (((wakeMin - bedMin) % DAY_MIN) + DAY_MIN) % DAY_MIN;

  // Why this night cannot be written, in the reader's words, or null when it
  // can. The caller shows it on the clocks and blocks the save on it: the day
  // sheet writes two rows, and an invalid pair used to commit the journal and
  // only then throw, leaving half a day saved under a failure toast.
  let nightError: string | null = null;
  if (bedMin === null || wakeMin === null) {
    nightError = t('sleep.durationPending');
  } else if (durationMin === 0) {
    nightError = t('sleep.clocksEqual');
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (bedMin === null || wakeMin === null || !durationMin) {
        throw new Error(t('errors.save'));
      }

      const wakeAt = atLocalClock(localMidnight(defaults.localDate), wakeMin);
      const bedAt = new Date(wakeAt.getTime() - durationMin * 60_000);

      const res = await upsertSleepLog({
        bedAt: bedAt.toISOString(),
        wakeAt: wakeAt.toISOString(),
        latencyMin: fieldToNumber(latency),
        awakeningsMin: fieldToNumber(awakenings),
        quality,
        note: note.trim() === '' ? null : note.trim(),
        isFreeDay,
        factors,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
    // No toast, no refresh, no invalidation here. This is one of two writes the
    // day sheet makes, and the sheet owns the feedback for both — announcing
    // each one separately fired two toasts and refreshed a 4-query screen
    // twice.
  });

  return {
    bedClock,
    setBedClock,
    wakeClock,
    setWakeClock,
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
    nightError,
    canSave: nightError === null && !mutation.isPending,
    isSaving: mutation.isPending,
    // Whether anything in the form differs from what it was seeded with.
    //
    // Load-bearing, not a convenience. The clocks arrive PRE-FILLED — bedtime
    // from the fortnight's median, wake time from the clock — which is what
    // makes the morning save one tap. The same defaults mean that pressing
    // Save on a day that was never logged would invent a night out of a
    // guess. The modal writes the sleep half only when this is true or a row
    // already exists.
    isDirty:
      bedClock !== defaults.bedClock ||
      wakeClock !== defaults.wakeClock ||
      quality !== defaults.quality ||
      latency !== numberToField(defaults.latencyMin) ||
      awakenings !== numberToField(defaults.awakeningsMin) ||
      isFreeDay !== defaults.isFreeDay ||
      note !== (defaults.note ?? '') ||
      factors.length !== defaults.factors.length ||
      factors.some((factor) => !defaults.factors.includes(factor)),
    save: () => mutation.mutate(),
    /** For a caller that has to sequence this write against another one. */
    saveAsync: () => mutation.mutateAsync(),
  };
}

/**
 * A `YYYY-MM-DD` key as midnight in the DEVICE's zone.
 *
 * Not `new Date(key)`, which parses a bare date as UTC and therefore lands on
 * the previous day for every reader west of Greenwich — the one bug the whole
 * `localDate` convention exists to avoid. The three-argument constructor is
 * local by definition, which is what this needs: the instant it seeds has to
 * be resolved in the same zone whose name is sent with it.
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

function numberToField(value: number | null): string {
  return value === null ? '' : String(value);
}

/** An empty optional field is ABSENT, not zero: "no minutes awake recorded"
 *  and "measured zero minutes awake" are different claims, and only the second
 *  entitles the screen to show an efficiency figure. */
function fieldToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
