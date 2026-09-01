/**
 * What this spec defends: the summary is computed from the statistics module
 * rather than reimplemented, it carries the owner's configured target, and an
 * empty history produces a usable object rather than an exception on a page
 * that has already begun rendering.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetSummaryModule from './get-sleep-summary';

let getSleepSummary: typeof GetSummaryModule.getSleepSummary;

beforeAll(async () => {
  ({ getSleepSummary } = await import('./get-sleep-summary'));
});

const findMany = mock();
Object.defineProperty(prisma, 'sleepLog', {
  value: { findMany },
  writable: true,
  configurable: true,
});

// The settings delegate is replaced too, rather than left to fail against the
// unreachable test database URL. `getWorkspaceSettings` swallows a failed read
// and returns the defaults, so an unmocked delegate would still produce a
// target — but it would be the DEFAULT one, and the contract this spec claims
// to defend is that the summary carries the OWNER'S CONFIGURED target. Only a
// stored value that differs from the default can tell those two apart.
const settingsFindUnique = mock();
Object.defineProperty(prisma, 'workspaceSettings', {
  value: { findUnique: settingsFindUnique },
  writable: true,
  configurable: true,
});

const night = (day: string, bed: string, wake: string) => ({
  id: `sleep-${day}`,
  localDate: new Date(`${day}T00:00:00.000Z`),
  bedAt: new Date(bed),
  wakeAt: new Date(wake),
  riseAt: null as Date | null,
  latencyMin: null as number | null,
  awakeningsMin: null as number | null,
  awakeningsCount: null as number | null,
  quality: 4,
  restedness: null as number | null,
  napBucket: null as string | null,
  note: null,
  isFreeDay: false,
  factors: [],
});

const input = { days: 14, timeZone: 'Asia/Ho_Chi_Minh' };

describe('getSleepSummary', () => {
  beforeEach(() => {
    findMany
      .mockReset()
      .mockResolvedValue([
        night(
          '2026-08-21',
          '2026-08-20T16:00:00.000Z',
          '2026-08-20T23:00:00.000Z'
        ),
        night(
          '2026-08-22',
          '2026-08-21T16:40:00.000Z',
          '2026-08-22T00:10:00.000Z'
        ),
      ]);
    settingsFindUnique
      .mockReset()
      .mockResolvedValue({ preferences: { sleepTargetMin: 450 } });
  });

  it('returns one night per stored row, oldest first', async () => {
    const res = await getSleepSummary(input);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data.nights.map((n) => n.localDate)).toEqual([
      '2026-08-21',
      '2026-08-22',
    ]);
  });

  it('reports debt against the configured target, never negative', async () => {
    const res = await getSleepSummary(input);

    if (!res.success) throw new Error('expected success');
    // 7h00 and 7h30 against a 7h30 goal: 30 minutes short, then level.
    expect(res.data.targetMin).toBe(450);
    expect(res.data.debtMin).toBe(30);
  });

  it('returns a usable object with no history at all', async () => {
    findMany.mockResolvedValue([]);

    const res = await getSleepSummary(input);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data.nights).toEqual([]);
    expect(res.data.debtMin).toBe(0);
    expect(res.data.streak).toBe(0);
    expect(res.data.bedtimeSdMin).toBeNull();
  });

  it('withholds every chronobiology figure on a two-night history', async () => {
    // SRI needs two consecutive FULLY DETERMINED days, which takes four
    // nights; social jetlag and MSFsc need both kinds of day. Two nights of
    // work days can support none of them, and a number here would be invented.
    const res = await getSleepSummary(input);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data.sri).toBeNull();
    expect(res.data.socialJetlagMin).toBeNull();
    expect(res.data.msfscMin).toBeNull();
    expect(res.data.workDayCount).toBe(2);
    expect(res.data.freeDayCount).toBe(0);
  });

  it('scores an identical four-night run as perfectly regular', async () => {
    // 23:00 -> 07:00 local (UTC+7) on four consecutive days.
    findMany.mockResolvedValue(
      ['2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22'].map((d) => {
        const wake = new Date(`${d}T00:00:00.000Z`);
        return night(
          d,
          new Date(wake.getTime() - 60 * 60_000).toISOString(),
          new Date(wake.getTime() + 420 * 60_000).toISOString()
        );
      })
    );

    const res = await getSleepSummary(input);

    if (!res.success) throw new Error('expected success');
    expect(res.data.sri).toBeCloseTo(100, 6);
  });

  it('counts free and work days so the screen can explain a null', async () => {
    findMany.mockResolvedValue([
      {
        ...night(
          '2026-08-21',
          '2026-08-20T16:00:00.000Z',
          '2026-08-20T23:00:00.000Z'
        ),
        isFreeDay: true,
      },
      night(
        '2026-08-22',
        '2026-08-21T16:40:00.000Z',
        '2026-08-22T00:10:00.000Z'
      ),
    ]);

    const res = await getSleepSummary(input);

    if (!res.success) throw new Error('expected success');
    expect(res.data.freeDayCount).toBe(1);
    expect(res.data.workDayCount).toBe(1);
    // One of each is still far below the three-day floor.
    expect(res.data.socialJetlagMin).toBeNull();
  });

  it('selects the columns the derived figures need', async () => {
    // A column missing from the select does not throw — it silently arrives
    // undefined and efficiency quietly reverts to the pre-riseAt formula.
    await getSleepSummary(input);

    const { select } = findMany.mock.calls[0][0];
    expect(select.riseAt).toBe(true);
    expect(select.awakeningsCount).toBe(true);
    expect(select.napBucket).toBe(true);
  });

  it('measures efficiency against time in BED, ending at riseAt', async () => {
    // 23:40 -> 07:10 with 20m latency, then up at 07:40.
    findMany.mockResolvedValue([
      {
        ...night(
          '2026-08-22',
          '2026-08-21T16:40:00.000Z',
          '2026-08-22T00:10:00.000Z'
        ),
        riseAt: new Date('2026-08-22T00:40:00.000Z'),
        latencyMin: 20,
      },
    ]);

    const res = await getSleepSummary(input);

    if (!res.success) throw new Error('expected success');
    const [only] = res.data.nights;
    expect(only.timeInBedMin).toBe(480);
    expect(only.sleepWindowMin).toBe(450);
    expect(only.totalSleepMin).toBe(430);
    expect(only.efficiencyPct).toBeCloseTo((430 / 480) * 100, 5);
    expect(only.riseEstimated).toBe(false);
  });

  it('falls back to the wake time on a row written before riseAt existed', async () => {
    findMany.mockResolvedValue([
      {
        ...night(
          '2026-08-22',
          '2026-08-21T16:40:00.000Z',
          '2026-08-22T00:10:00.000Z'
        ),
        latencyMin: 20,
      },
    ]);

    const res = await getSleepSummary(input);

    if (!res.success) throw new Error('expected success');
    const [only] = res.data.nights;
    expect(only.timeInBedMin).toBe(450);
    expect(only.riseEstimated).toBe(true);
    expect(only.efficiencyPct).toBeCloseTo((430 / 450) * 100, 5);
  });

  it('never lets a recorded nap change duration or debt', async () => {
    const base = night(
      '2026-08-22',
      '2026-08-21T16:40:00.000Z',
      '2026-08-22T00:10:00.000Z'
    );
    findMany.mockResolvedValue([{ ...base, napBucket: 'gt60' }]);
    const withNap = await getSleepSummary(input);

    findMany.mockResolvedValue([base]);
    const withoutNap = await getSleepSummary(input);

    if (!withNap.success || !withoutNap.success) {
      throw new Error('expected success');
    }
    expect(withNap.data.nights[0].napBucket).toBe('gt60');
    expect(withNap.data.nights[0].totalSleepMin).toBe(
      withoutNap.data.nights[0].totalSleepMin
    );
    expect(withNap.data.debtMin).toBe(withoutNap.data.debtMin);
  });

  it('rejects a window outside the allowed bounds', async () => {
    const res = await getSleepSummary({ days: 3650, timeZone: 'UTC' });

    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });
});
