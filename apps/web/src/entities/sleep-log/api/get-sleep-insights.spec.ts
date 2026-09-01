/**
 * What this spec defends: the mood join is by the day of WAKING, the window is
 * the one asked for, and an empty history produces a usable object rather than
 * an exception on a page that has already begun rendering.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetInsightsModule from './get-sleep-insights';

let getSleepInsights: typeof GetInsightsModule.getSleepInsights;

beforeAll(async () => {
  ({ getSleepInsights } = await import('./get-sleep-insights'));
});

const sleepFindMany = mock();
Object.defineProperty(prisma, 'sleepLog', {
  value: { findMany: sleepFindMany },
  writable: true,
  configurable: true,
});

const dayFindMany = mock();
Object.defineProperty(prisma, 'dayEntry', {
  value: { findMany: dayFindMany },
  writable: true,
  configurable: true,
});

const settingsFindUnique = mock();
Object.defineProperty(prisma, 'workspaceSettings', {
  value: { findUnique: settingsFindUnique },
  writable: true,
  configurable: true,
});

/** A four-hour night, so it lands in the `<6h` bucket. */
const shortNight = (day: string) => ({
  localDate: new Date(`${day}T00:00:00.000Z`),
  bedAt: new Date(`${day}T00:00:00.000Z`),
  wakeAt: new Date(`${day}T04:00:00.000Z`),
  riseAt: null as Date | null,
  latencyMin: null as number | null,
  awakeningsMin: null as number | null,
  awakeningsCount: null as number | null,
  napBucket: null as string | null,
  isFreeDay: false,
  quality: null as number | null,
  restedness: null as number | null,
  factors: [] as string[],
});

const input = { days: 90, timeZone: 'Asia/Ho_Chi_Minh' };

describe('getSleepInsights', () => {
  beforeEach(() => {
    sleepFindMany.mockReset().mockResolvedValue([]);
    dayFindMany.mockReset().mockResolvedValue([]);
    settingsFindUnique
      .mockReset()
      .mockResolvedValue({ preferences: { sleepTargetMin: 450 } });
  });

  it('pairs a night with the mood of the day it woke into', async () => {
    // The night dated the 10th carries the 10th's mood, never the 11th's.
    // Reverse this join and every figure on the panel is off by one day.
    sleepFindMany.mockResolvedValue([shortNight('2026-08-10')]);
    dayFindMany.mockResolvedValue([
      { localDate: new Date('2026-08-10T00:00:00.000Z'), mood: 5 },
      { localDate: new Date('2026-08-11T00:00:00.000Z'), mood: 1 },
    ]);

    const res = await getSleepInsights(input);

    if (!res.success) throw new Error('expected success');
    expect(res.data.moodByDuration[0]).toEqual({
      id: 'lt6',
      n: 1,
      meanMood: 5,
    });
  });

  it('returns a usable object with no history at all', async () => {
    const res = await getSleepInsights(input);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data.nightCount).toBe(0);
    expect(res.data.contrasts).toEqual({ contrasts: [], progress: [] });
    expect(res.data.debt.debtMin).toBe(0);
    expect(res.data.debt.needMin).toBe(450);
    expect(res.data.week.observation).toBeNull();
    expect(res.data.moodByDuration.map((b) => b.n)).toEqual([0, 0, 0]);
  });

  it('reads both tables over the same window', async () => {
    await getSleepInsights(input);

    const sleepWhere = sleepFindMany.mock.calls[0][0].where.localDate;
    const dayWhere = dayFindMany.mock.calls[0][0].where.localDate;

    expect(dayWhere.gte.getTime()).toBe(sleepWhere.gte.getTime());
    expect(dayWhere.lte.getTime()).toBe(sleepWhere.lte.getTime());
  });

  it('selects the columns the contrasts need', async () => {
    // A column missing from the select does not throw — it arrives undefined
    // and the factor it feeds silently never clears the gate.
    await getSleepInsights(input);

    const { select } = sleepFindMany.mock.calls[0][0];
    expect(select.factors).toBe(true);
    expect(select.restedness).toBe(true);
    expect(select.quality).toBe(true);
    expect(select.isFreeDay).toBe(true);
  });

  it('rejects a window outside the allowed bounds', async () => {
    const res = await getSleepInsights({ days: 365, timeZone: 'UTC' });

    expect(res.success).toBe(false);
    expect(sleepFindMany).not.toHaveBeenCalled();
  });
});
