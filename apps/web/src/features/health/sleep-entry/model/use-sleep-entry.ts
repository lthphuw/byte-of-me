'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  type SleepFactor,
  sleepLogKeys,
  upsertSleepLog,
} from '@/entities/sleep-log';
import { useRouter } from '@/shared/i18n/navigation';
import { clockToMinutes } from '@/shared/lib/health/duration';

const DAY_MIN = 1440;

/** What the screen knows and the form starts from. Every field is resolved on
 *  the server — including the two clocks — so the first client render matches
 *  the SSR output exactly and nothing has to be filled in after mount. */
export interface SleepEntryDefaults {
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
 * `timeZone` is read from the device at submit, not from the server render.
 * The screen's zone comes from a geo header and is a good guess; the device's
 * is the fact, and it is the value the stored `local_date` is resolved with.
 */
export function useSleepEntry(defaults: SleepEntryDefaults) {
  const t = useTranslations('dashboard.health');
  const queryClient = useQueryClient();
  const router = useRouter();

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

  const mutation = useMutation({
    mutationFn: async () => {
      if (bedMin === null || wakeMin === null || !durationMin) {
        throw new Error(t('errors.save'));
      }

      const wakeAt = atLocalClock(new Date(), wakeMin);
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
    onSuccess: () => {
      toast.success(t('sleep.saved'));

      // `refresh()` BEFORE the invalidations, and it is the load-bearing half:
      // every figure on this page — the tiles, both charts — is rendered by a
      // server component, so a TanStack invalidation alone would redraw
      // nothing. The order matters because the router queues work behind a
      // pending server action; invalidating first has stranded a navigation in
      // this repo before. The query invalidations are for the client readers
      // this module will grow.
      router.refresh();
      queryClient.invalidateQueries({ queryKey: sleepLogKeys.summaryAll() });
      queryClient.invalidateQueries({ queryKey: sleepLogKeys.today() });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errors.save'));
    },
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
    canSave: Boolean(durationMin) && !mutation.isPending,
    isSaving: mutation.isPending,
    save: () => mutation.mutate(),
  };
}

/** Today, at a clock time, in the DEVICE's zone — the same zone whose name is
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
