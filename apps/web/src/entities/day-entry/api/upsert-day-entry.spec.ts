/**
 * What this spec defends: the write is owner-scoped, it upserts on
 * (ownerId, localDate) rather than inserting a duplicate, a future day is
 * refused, and a Prisma failure surfaces through `errorMsg` — the
 * `ApiResponse` contract, never a throw.
 *
 * `requireAdmin` is stubbed globally in `next-runtime-stubs.ts` and resolves
 * to `admin-1`; nothing here needs to mock it.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as UpsertModule from './upsert-day-entry';

let upsertDayEntry: typeof UpsertModule.upsertDayEntry;

beforeAll(async () => {
  ({ upsertDayEntry } = await import('./upsert-day-entry'));
});

const dayEntryUpsert = mock();
Object.defineProperty(prisma, 'dayEntry', {
  value: { upsert: dayEntryUpsert },
  writable: true,
  configurable: true,
});

const validInput = {
  localDate: '2026-08-22',
  mood: 4,
  reflection: 'A good day.',
  todayKey: '2026-08-23',
};

const storedRow = {
  id: 'entry-1',
  localDate: new Date('2026-08-22T00:00:00.000Z'),
  mood: 4,
  reflection: 'A good day.',
  photos: [],
};

beforeEach(() => {
  dayEntryUpsert.mockReset();
  dayEntryUpsert.mockResolvedValue(storedRow);
});

describe('upsertDayEntry', () => {
  it('upserts on the owner and the day, and serializes localDate', async () => {
    const res = await upsertDayEntry(validInput);

    expect(res.success).toBe(true);
    expect(res.success && res.data.localDate).toBe('2026-08-22');

    const args = dayEntryUpsert.mock.calls[0][0];
    expect(args.where.ownerId_localDate.ownerId).toBe('admin-1');
    expect(args.create.ownerId).toBe('admin-1');
  });

  it('refuses a day in the future without touching the database', async () => {
    const res = await upsertDayEntry({ ...validInput, localDate: '2026-08-24' });

    expect(res.success).toBe(false);
    expect(dayEntryUpsert).not.toHaveBeenCalled();
  });

  it('returns errorMsg rather than throwing when Prisma fails', async () => {
    dayEntryUpsert.mockRejectedValue(new Error('connection lost'));

    const res = await upsertDayEntry(validInput);

    expect(res.success).toBe(false);
    expect(res.success === false && res.errorMsg.length > 0).toBe(true);
  });
});
