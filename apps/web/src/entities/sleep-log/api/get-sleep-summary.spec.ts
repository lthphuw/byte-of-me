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
  latencyMin: null,
  awakeningsMin: null,
  quality: 4,
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

  it('rejects a window outside the allowed bounds', async () => {
    const res = await getSleepSummary({ days: 3650, timeZone: 'UTC' });

    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });
});
