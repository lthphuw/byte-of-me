/**
 * What this spec defends: the write is owner-scoped, it upserts on
 * (ownerId, localDate) rather than inserting a duplicate, localDate is derived
 * from the WAKE time in the caller's zone, and a Prisma failure surfaces
 * through `errorMsg` — the `ApiResponse` contract.
 *
 * Delegates are replaced wholesale (never `spyOn`) for the Prisma-7 reason
 * documented in `get-note-tree.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as UpsertModule from './upsert-sleep-log';

let upsertSleepLog: typeof UpsertModule.upsertSleepLog;

beforeAll(async () => {
  ({ upsertSleepLog } = await import('./upsert-sleep-log'));
});

const sleepLogUpsert = mock();
Object.defineProperty(prisma, 'sleepLog', {
  value: { upsert: sleepLogUpsert },
  writable: true,
  configurable: true,
});

const validInput = {
  bedAt: '2026-08-21T16:40:00.000Z', // 23:40 local (UTC+7)
  wakeAt: '2026-08-22T00:10:00.000Z', // 07:10 local on the 22nd
  latencyMin: 15,
  awakeningsMin: null,
  quality: 4,
  note: null,
  isFreeDay: false,
  factors: ['caffeine_late'],
  timeZone: 'Asia/Ho_Chi_Minh',
};

const storedRow = {
  id: 'sleep-1',
  localDate: new Date('2026-08-22T00:00:00.000Z'),
  bedAt: new Date(validInput.bedAt),
  wakeAt: new Date(validInput.wakeAt),
  latencyMin: 15,
  awakeningsMin: null,
  quality: 4,
  note: null,
  isFreeDay: false,
  factors: ['caffeine_late'],
};

describe('upsertSleepLog', () => {
  beforeEach(() => {
    sleepLogUpsert.mockReset().mockResolvedValue(storedRow);
  });

  it('derives localDate from the WAKE time in the caller zone', async () => {
    await upsertSleepLog(validInput);

    const args = sleepLogUpsert.mock.calls[0][0];
    expect(args.where.ownerId_localDate.localDate.toISOString()).toBe(
      '2026-08-22T00:00:00.000Z'
    );
  });

  it('scopes the upsert to the authenticated owner', async () => {
    await upsertSleepLog(validInput);

    const args = sleepLogUpsert.mock.calls[0][0];
    expect(args.where.ownerId_localDate.ownerId).toBeTruthy();
    expect(args.create.ownerId).toBe(args.where.ownerId_localDate.ownerId);
  });

  it('returns the row as ISO strings in a success envelope', async () => {
    const res = await upsertSleepLog(validInput);

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data.localDate).toBe('2026-08-22');
    expect(res.data.bedAt).toBe(validInput.bedAt);
  });

  it('rejects a wake time before the bed time without touching the database', async () => {
    const res = await upsertSleepLog({
      ...validInput,
      wakeAt: '2026-08-21T10:00:00.000Z',
    });

    expect(res.success).toBe(false);
    expect(sleepLogUpsert).not.toHaveBeenCalled();
  });

  it('rejects an unknown factor code', async () => {
    const res = await upsertSleepLog({
      ...validInput,
      factors: ['moon_phase'],
    });

    expect(res.success).toBe(false);
    expect(sleepLogUpsert).not.toHaveBeenCalled();
  });

  it('surfaces a Prisma failure through errorMsg', async () => {
    sleepLogUpsert.mockRejectedValue(new Error('connection lost'));

    const res = await upsertSleepLog(validInput);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    expect(res.errorMsg).toBeTruthy();
  });
});
