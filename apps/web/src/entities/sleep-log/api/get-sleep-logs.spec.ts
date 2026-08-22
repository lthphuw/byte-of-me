/**
 * What this spec defends: the range read is owner-scoped, bounded at both
 * ends, ordered oldest-first for charting, and surfaces failures through
 * `errorMsg`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetLogsModule from './get-sleep-logs';

let getSleepLogs: typeof GetLogsModule.getSleepLogs;

beforeAll(async () => {
  ({ getSleepLogs } = await import('./get-sleep-logs'));
});

const findMany = mock();
Object.defineProperty(prisma, 'sleepLog', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const row = {
  id: 'sleep-1',
  localDate: new Date('2026-08-22T00:00:00.000Z'),
  bedAt: new Date('2026-08-21T16:40:00.000Z'),
  wakeAt: new Date('2026-08-22T00:10:00.000Z'),
  latencyMin: null,
  awakeningsMin: null,
  quality: 4,
  note: null,
  isFreeDay: false,
  factors: [],
};

describe('getSleepLogs', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([row]);
  });

  it('scopes the read to the authenticated owner and bounds both ends', async () => {
    await getSleepLogs({ from: '2026-08-08', to: '2026-08-22' });

    const args = findMany.mock.calls[0][0];
    expect(args.where.ownerId).toBeTruthy();
    expect(args.where.localDate.gte.toISOString()).toBe(
      '2026-08-08T00:00:00.000Z'
    );
    expect(args.where.localDate.lte.toISOString()).toBe(
      '2026-08-22T00:00:00.000Z'
    );
  });

  it('orders oldest first, which is the order every chart draws in', async () => {
    await getSleepLogs({ from: '2026-08-08', to: '2026-08-22' });
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ localDate: 'asc' });
  });

  it('serializes dates as ISO strings', async () => {
    const res = await getSleepLogs({ from: '2026-08-08', to: '2026-08-22' });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data[0].localDate).toBe('2026-08-22');
  });

  it('rejects a reversed range without touching the database', async () => {
    const res = await getSleepLogs({ from: '2026-08-22', to: '2026-08-08' });

    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('surfaces a Prisma failure through errorMsg', async () => {
    findMany.mockRejectedValue(new Error('connection lost'));

    const res = await getSleepLogs({ from: '2026-08-08', to: '2026-08-22' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});
