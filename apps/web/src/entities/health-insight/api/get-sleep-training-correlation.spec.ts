/**
 * What this spec defends: both reads are owner-scoped and bounded, only
 * FINISHED sessions count, a session is paired with the sleep that ended on
 * its own day, `Decimal` weights become numbers before they reach the tonnage
 * sum, and a history too short to support a coefficient still returns a usable
 * object carrying the counts a screen needs to explain itself.
 *
 * Delegates are replaced wholesale (never `spyOn`) for the Prisma-7 reason
 * documented in the note specs: Prisma 7 synthesizes a fresh function on every
 * method access, so a spy is bypassed.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as CorrelationModule from './get-sleep-training-correlation';

let getSleepTrainingCorrelation: typeof CorrelationModule.getSleepTrainingCorrelation;

beforeAll(async () => {
  ({ getSleepTrainingCorrelation } = await import(
    './get-sleep-training-correlation'
  ));
});

const sleepFindMany = mock();
Object.defineProperty(prisma, 'sleepLog', {
  value: { findMany: sleepFindMany },
  writable: true,
  configurable: true,
});

const sessionFindMany = mock();
Object.defineProperty(prisma, 'workoutSession', {
  value: { findMany: sessionFindMany },
  writable: true,
  configurable: true,
});

const MINUTE_MS = 60_000;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Stands in for a Prisma `Decimal`: an object whose value is only reachable
 *  through `toNumber()`, which is exactly what makes an unconverted one NaN. */
const dec = (value: number) => ({ toNumber: () => value });

/** A night that ended at midnight opening `iso` after `minutes` asleep. */
const sleepRow = (iso: string, minutes: number) => ({
  localDate: day(iso),
  bedAt: new Date(day(iso).getTime() - minutes * MINUTE_MS),
  wakeAt: day(iso),
  latencyMin: null,
  awakeningsMin: null,
});

const workingSet = (reps: number, weightKg: number, rpe: number | null) => ({
  reps,
  weightKg: dec(weightKg),
  rpe: rpe === null ? null : dec(rpe),
  durationSec: null,
  isWarmup: false,
});

const sessionRow = (
  iso: string,
  sets: ReturnType<typeof workingSet>[],
  metric = 'weight_reps'
) => ({
  localDate: day(iso),
  exercises: [
    {
      exerciseId: 'squat',
      exercise: {
        metric,
        primaryMuscle: 'quads',
        secondaryMuscles: ['glutes'],
      },
      sets,
    },
  ],
});

const input = { days: 90, timeZone: 'Asia/Ho_Chi_Minh' };

/** `n` consecutive days from 2026-06-01, both sides logged, sleep and tonnage
 *  rising together. */
const pairedHistory = (n: number) => {
  const iso = (i: number) =>
    new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10);

  sleepFindMany.mockResolvedValue(
    Array.from({ length: n }, (_, i) => sleepRow(iso(i), 300 + i * 5))
  );
  sessionFindMany.mockResolvedValue(
    Array.from({ length: n }, (_, i) =>
      sessionRow(iso(i), [workingSet(5, 100 + i, 7 + (i % 5) * 0.5)])
    )
  );
};

describe('getSleepTrainingCorrelation', () => {
  beforeEach(() => {
    sleepFindMany.mockReset().mockResolvedValue([]);
    sessionFindMany.mockReset().mockResolvedValue([]);
  });

  it('scopes both reads to the signed-in owner and bounds both windows', async () => {
    await getSleepTrainingCorrelation(input);

    for (const call of [sleepFindMany, sessionFindMany]) {
      const { where } = call.mock.calls[0][0];
      expect(where.ownerId).toBe('admin-1');
      expect(where.localDate.gte).toBeInstanceOf(Date);
      expect(where.localDate.lte).toBeInstanceOf(Date);
    }
  });

  it('reads only finished sessions', async () => {
    await getSleepTrainingCorrelation(input);

    // An in-progress session's tonnage is still being written; counting it
    // would score an ordinary day as a light one until it is closed.
    expect(sessionFindMany.mock.calls[0][0].where.endedAt).toEqual({
      not: null,
    });
  });

  it('returns a usable object with no history at all', async () => {
    const res = await getSleepTrainingCorrelation(input);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data.points).toEqual([]);
    expect(res.data.volumeLoad).toBeNull();
    expect(res.data.meanRpe).toBeNull();
    expect(res.data.trained).toBeNull();
    expect(res.data.pairedDays).toBe(0);
    expect(res.data.sleepOnlyDays).toBe(0);
    expect(res.data.sessionOnlyDays).toBe(0);
    expect(res.data.minPairs).toBeGreaterThan(0);
  });

  it('pairs a session with the sleep that ENDED on the session day', async () => {
    // The night before training on the 11th is the sleep whose localDate IS
    // the 11th. Reaching back to the 10th would put 300 on the training day.
    sleepFindMany.mockResolvedValue([
      sleepRow('2026-06-10', 300),
      sleepRow('2026-06-11', 500),
    ]);
    sessionFindMany.mockResolvedValue([
      sessionRow('2026-06-11', [workingSet(5, 100, 8)]),
    ]);

    const res = await getSleepTrainingCorrelation(input);

    if (!res.success) throw new Error('expected success');
    expect(res.data.points).toEqual([
      {
        localDate: '2026-06-10',
        totalSleepMin: 300,
        volumeLoadKg: null,
        meanRpe: null,
        trained: false,
      },
      {
        localDate: '2026-06-11',
        totalSleepMin: 500,
        // 5 reps x 100 kg.
        volumeLoadKg: 500,
        meanRpe: 8,
        trained: true,
      },
    ]);
  });

  it('converts Decimal weights before they reach the tonnage sum', async () => {
    sleepFindMany.mockResolvedValue([sleepRow('2026-06-11', 480)]);
    sessionFindMany.mockResolvedValue([
      sessionRow('2026-06-11', [
        workingSet(5, 102.5, 8),
        workingSet(3, 110, 9.5),
      ]),
    ]);

    const res = await getSleepTrainingCorrelation(input);

    if (!res.success) throw new Error('expected success');
    // 5*102.5 + 3*110 = 512.5 + 330 = 842.5; (8 + 9.5) / 2 = 8.75.
    // An unconverted Decimal makes both of these NaN.
    expect(res.data.points[0].volumeLoadKg).toBe(842.5);
    expect(res.data.points[0].meanRpe).toBe(8.75);
  });

  it('counts a session on an unlogged night without pairing it', async () => {
    sleepFindMany.mockResolvedValue([sleepRow('2026-06-10', 400)]);
    sessionFindMany.mockResolvedValue([
      sessionRow('2026-06-11', [workingSet(5, 100, 8)]),
    ]);

    const res = await getSleepTrainingCorrelation(input);

    if (!res.success) throw new Error('expected success');
    expect(res.data.pairedDays).toBe(0);
    expect(res.data.sleepOnlyDays).toBe(1);
    expect(res.data.sessionOnlyDays).toBe(1);
    // No predictor for the 11th, so it is not a point.
    expect(res.data.points).toHaveLength(1);
  });

  it('withholds every coefficient below the floor but carries the counts', async () => {
    const res0 = await getSleepTrainingCorrelation(input);
    if (!res0.success) throw new Error('expected success');

    pairedHistory(res0.data.minPairs - 1);
    const res = await getSleepTrainingCorrelation(input);

    if (!res.success) throw new Error('expected success');
    expect(res.data.volumeLoad).toBeNull();
    expect(res.data.meanRpe).toBeNull();
    expect(res.data.trained).toBeNull();
    // "not enough data yet, 19 of 20 paired days" is renderable from this.
    expect(res.data.pairedDays).toBe(res.data.minPairs - 1);
  });

  it('reports the coefficient with its sample size once the floor is met', async () => {
    const res0 = await getSleepTrainingCorrelation(input);
    if (!res0.success) throw new Error('expected success');
    const floor = res0.data.minPairs;

    pairedHistory(floor);
    const res = await getSleepTrainingCorrelation(input);

    if (!res.success) throw new Error('expected success');
    // Sleep and tonnage both rise every day: a perfect monotone relationship.
    expect(res.data.volumeLoad?.rho).toBeCloseTo(1, 12);
    expect(res.data.volumeLoad?.n).toBe(floor);
    expect(res.data.pairedDays).toBe(floor);
    // Every logged day trained, so there is nothing to distinguish.
    expect(res.data.trained).toBeNull();
  });

  it('drops an exercise whose metric is not in the vocabulary', async () => {
    sleepFindMany.mockResolvedValue([sleepRow('2026-06-11', 480)]);
    sessionFindMany.mockResolvedValue([
      sessionRow('2026-06-11', [workingSet(5, 100, 8)], 'not_a_metric'),
    ]);

    const res = await getSleepTrainingCorrelation(input);

    if (!res.success) throw new Error('expected success');
    // The day still trained — a row that cannot be typed has no trustworthy
    // tonnage, so it contributes none rather than the wrong formula's answer.
    expect(res.data.points[0].trained).toBe(true);
    expect(res.data.points[0].volumeLoadKg).toBe(0);
    expect(res.data.points[0].meanRpe).toBeNull();
  });

  it('rejects a window outside the allowed bounds without querying', async () => {
    const res = await getSleepTrainingCorrelation({
      days: 3650,
      timeZone: 'UTC',
    });

    expect(res.success).toBe(false);
    expect(sleepFindMany).not.toHaveBeenCalled();
    expect(sessionFindMany).not.toHaveBeenCalled();
  });

  it('rejects an unknown time zone', async () => {
    const res = await getSleepTrainingCorrelation({
      days: 90,
      timeZone: 'Mars/Olympus_Mons',
    });

    expect(res.success).toBe(false);
    expect(sleepFindMany).not.toHaveBeenCalled();
  });

  it('surfaces a failed read through errorMsg rather than throwing', async () => {
    // A throw here escapes the server component that awaits this and replaces
    // the whole page with the root error boundary.
    sleepFindMany.mockRejectedValue(new Error('connection terminated'));

    const res = await getSleepTrainingCorrelation(input);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBe('connection terminated');
  });
});
