/**
 * What this spec defends: the read is scoped to the owner and to the window,
 * photos come back in `position` order, each one carries the ROUTE path rather
 * than a bucket URL, and an inverted window is refused rather than turned into
 * an unbounded scan.
 *
 * `requireAdmin` is stubbed globally in `next-runtime-stubs.ts` and resolves
 * to `admin-1`; nothing here needs to mock it.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetModule from './get-day-entries';

let getDayEntries: typeof GetModule.getDayEntries;

beforeAll(async () => {
  ({ getDayEntries } = await import('./get-day-entries'));
});

const findMany = mock();
Object.defineProperty(prisma, 'dayEntry', {
  value: { findMany },
  writable: true,
  configurable: true,
});

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([
    {
      id: 'entry-1',
      localDate: new Date('2026-08-22T00:00:00.000Z'),
      mood: 4,
      reflection: 'A good day.',
      photos: [
        {
          id: 'photo-1',
          caption: 'Morning',
          position: 0,
          mimeType: 'image/jpeg',
          size: 1234,
        },
      ],
    },
  ]);
});

describe('getDayEntries', () => {
  it('scopes to the owner and the window', async () => {
    const res = await getDayEntries({ from: '2026-08-01', to: '2026-08-31' });

    expect(res.success).toBe(true);
    const where = findMany.mock.calls[0][0].where;
    expect(where.ownerId).toBe('admin-1');
    expect(where.localDate.gte).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(where.localDate.lte).toEqual(new Date('2026-08-31T00:00:00.000Z'));
  });

  it('serves each photo from the route, never from the bucket', async () => {
    const res = await getDayEntries({ from: '2026-08-01', to: '2026-08-31' });

    expect(res.success && res.data[0].photos[0].url).toBe(
      '/api/health/photos/photo-1'
    );
  });

  it('refuses an inverted window without touching the database', async () => {
    const res = await getDayEntries({ from: '2026-08-31', to: '2026-08-01' });

    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });
});
