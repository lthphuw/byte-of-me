/**
 * What this spec defends: the hub's stats read is owner-scoped on every count,
 * recents exclude archived notes and never carry documents, and a Prisma
 * failure surfaces through `errorMsg` — the `ApiResponse` contract.
 *
 * Delegates are replaced wholesale (never `spyOn`) for the Prisma-7 reason
 * documented in `get-note-tree.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetSpaceStatsModule from './get-space-stats';

let getSpaceStats: typeof GetSpaceStatsModule.getSpaceStats;

beforeAll(async () => {
  ({ getSpaceStats } = await import('./get-space-stats'));
});

const noteCount = mock();
const noteFindMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { count: noteCount, findMany: noteFindMany },
  writable: true,
  configurable: true,
});

const linkCount = mock();
Object.defineProperty(prisma, 'noteLink', {
  value: { count: linkCount },
  writable: true,
  configurable: true,
});

const transaction = mock((operations: Promise<unknown>[]) =>
  Promise.all(operations)
);
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

const recentRow = {
  id: 'note-1',
  title: 'Reading list',
  status: 'draft',
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('getSpaceStats', () => {
  beforeEach(() => {
    noteCount.mockReset().mockResolvedValue(4);
    linkCount.mockReset().mockResolvedValue(7);
    noteFindMany.mockReset().mockResolvedValue([recentRow]);
    transaction.mockClear();
  });

  it('returns counts and recent notes in a success envelope', async () => {
    const res = await getSpaceStats();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.noteCount).toBe(4);
    expect(res.data.archivedCount).toBe(4);
    expect(res.data.linkCount).toBe(7);
    expect(res.data.recentNotes).toEqual([recentRow]);
  });

  it('scopes every count and the recents to the calling owner', async () => {
    await getSpaceStats();

    for (const call of noteCount.mock.calls) {
      const where = call[0]?.where as Record<string, unknown>;
      expect(where.ownerId).toBe('admin-1');
    }
    const linkWhere = linkCount.mock.calls[0]?.[0]?.where as {
      source: { ownerId: string };
    };
    expect(linkWhere.source.ownerId).toBe('admin-1');
    const recentWhere = noteFindMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(recentWhere.ownerId).toBe('admin-1');
  });

  it('caps recents at five, newest first, excluding archived documents', async () => {
    await getSpaceStats();

    const args = noteFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
      take: number;
      select: Record<string, unknown>;
    };
    expect(args.where.archivedAt).toBeNull();
    expect(args.orderBy).toEqual({ updatedAt: 'desc' });
    expect(args.take).toBe(5);
    expect(args.select.content).toBeUndefined();
    expect(args.select.plainText).toBeUndefined();
  });

  it('reports failure through errorMsg, never error', async () => {
    noteCount.mockRejectedValue(new Error('connection refused'));

    const res = await getSpaceStats();

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
