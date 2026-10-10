/**
 * The outcome of `reorderFeaturedWork`: it swaps an entry with its neighbour,
 * writes nothing at the ends of the list or for someone else's entry, and heals
 * duplicate `sortOrder`s instead of swapping two equal numbers into a no-op.
 * `$transaction` runs against a fake `tx`, so no database is touched.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type * as ReorderModule from './reorder-featured-work';

import { resetTestUser, setTestUser } from '@/shared/lib/auth/set-test-user.test-helper';

type Row = { id: string; sortOrder: number };
const findMany = mock<(args: unknown) => Promise<Row[]>>();
const update = mock<(args: unknown) => Promise<Row>>();

const originalTransaction = Object.getOwnPropertyDescriptor(
  prisma,
  '$transaction'
);
Object.defineProperty(prisma, '$transaction', {
  value: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ featuredWork: { findMany, update } }),
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

let reorderFeaturedWork: typeof ReorderModule.reorderFeaturedWork;

const writes = () =>
  update.mock.calls
    .map(
      (call) =>
        call[0] as { where: { id: string }; data: { sortOrder: number } }
    )
    .map((arg) => [arg.where.id, arg.data.sortOrder]);

beforeAll(async () => {
  ({ reorderFeaturedWork } = await import('./reorder-featured-work'));
});

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
  ]);
  update.mockReset().mockResolvedValue({ id: 'x', sortOrder: 0 });
  logError.mockClear();
});

afterAll(() => {
  if (originalTransaction)
    Object.defineProperty(prisma, '$transaction', originalTransaction);
  logError.mockRestore();
  resetTestUser();
});

describe('reorderFeaturedWork', () => {
  it('swaps the middle item with the one above it, scoped to the caller', async () => {
    const result = await reorderFeaturedWork('b', 'up');

    expect(result).toEqual({ success: true, data: null });
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { userId: 'admin-1' },
    });
    expect(writes().sort()).toEqual([
      ['a', 1],
      ['b', 0],
    ]);
  });

  it('swaps the middle item with the one below it', async () => {
    await reorderFeaturedWork('b', 'down');

    expect(writes().sort()).toEqual([
      ['b', 2],
      ['c', 1],
    ]);
  });

  it('writes nothing when the first item moves up or the last moves down', async () => {
    expect(await reorderFeaturedWork('a', 'up')).toEqual({
      success: true,
      data: null,
    });
    expect(await reorderFeaturedWork('c', 'down')).toEqual({
      success: true,
      data: null,
    });

    expect(update).not.toHaveBeenCalled();
  });

  it('fails without writing when the id is not the caller\'s item', async () => {
    const result = await reorderFeaturedWork('someone-elses', 'up');

    expect(result).toEqual({
      success: false,
      errorMsg: 'Featured work not found',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('renumbers duplicate sortOrders to distinct values, then swaps', async () => {
    findMany.mockResolvedValue([
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 0 },
      { id: 'c', sortOrder: 0 },
    ]);

    await reorderFeaturedWork('c', 'up');

    // list order is a, b, c -> renumbered 0, 1, 2 -> c and b swap
    const final = new Map<string, number>([
      ['a', 0],
      ['b', 0],
      ['c', 0],
    ]);
    for (const [id, sortOrder] of writes()) final.set(id as string, sortOrder as number);
    expect([...final.entries()]).toEqual([
      ['a', 0],
      ['b', 2],
      ['c', 1],
    ]);
  });

  it('rejects an unknown direction without reading or writing', async () => {
    const result = await reorderFeaturedWork('b', 'sideways' as 'up');

    expect(result.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a non-admin caller before reading anything', async () => {
    setTestUser({ id: 'user-2', role: 'USER' });
    try {
      const result = await reorderFeaturedWork('b', 'up');

      expect(result.success).toBe(false);
      expect(findMany).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });

  it('reports a failed write', async () => {
    update.mockRejectedValue(new Error('deadlock detected'));

    const result = await reorderFeaturedWork('b', 'up');

    expect(result).toEqual({ success: false, errorMsg: 'deadlock detected' });
    expect(logError).toHaveBeenCalled();
  });
});
