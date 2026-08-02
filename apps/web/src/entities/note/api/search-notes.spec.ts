/**
 * Search is the only read that touches `plainText`. Three things must hold: it
 * matches body text the title does not contain, it never crosses an owner
 * boundary, and caller-supplied pagination is bounded before it reaches Prisma.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as SearchNotesModule from './search-notes';

let searchNotes: typeof SearchNotesModule.searchNotes;

beforeAll(async () => {
  ({ searchNotes } = await import('./search-notes'));
});

const findMany = mock();
const count = mock();
Object.defineProperty(prisma, 'note', {
  value: { findMany, count },
  writable: true,
  configurable: true,
});

describe('searchNotes', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      {
        id: 'note-1',
        title: 'Kafka',
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        plainText: 'consumer group rebalance protocol',
      },
    ]);
    count.mockReset().mockResolvedValue(1);
  });

  it('returns a PaginatedData envelope with a snippet, not the document', async () => {
    const res = await searchNotes({
      query: 'rebalance',
      includeArchived: false,
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.data[0]?.snippet).toContain('rebalance');
    expect(
      (res.data.data[0] as { content?: unknown }).content
    ).toBeUndefined();
    expect(res.data.meta.totalCount).toBe(1);
  });

  it('matches against plainText as well as title', async () => {
    await searchNotes({ query: 'rebalance', includeArchived: false });

    const where = findMany.mock.calls[0]?.[0]?.where as {
      OR: Array<Record<string, unknown>>;
    };
    const fields = where.OR.flatMap((clause) => Object.keys(clause));
    expect(fields).toContain('plainText');
    expect(fields).toContain('title');
  });

  it('scopes results to the calling owner', async () => {
    await searchNotes({ query: 'rebalance', includeArchived: false });

    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.ownerId).toBe('admin-1');
  });

  it('excludes archived notes by default', async () => {
    await searchNotes({ query: 'rebalance', includeArchived: false });

    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.archivedAt).toBeNull();
  });

  it('clamps out-of-range pagination before it reaches Prisma', async () => {
    await searchNotes({
      query: 'x',
      includeArchived: false,
      page: 0,
      limit: 1_000_000,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  // Pins the contract `buildPaginatedMeta` already documents and tests
  // (`shared/lib/pagination.spec.ts`): zero results means zero pages, not
  // one. A hand-rolled `Math.max(1, ...)` here would silently disagree with
  // every other paginated action in the repo.
  it('reports totalPages: 0 for an empty result set', async () => {
    findMany.mockResolvedValueOnce([]);
    count.mockResolvedValueOnce(0);

    const res = await searchNotes({ query: 'nothing', includeArchived: false });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.meta.totalPages).toBe(0);
  });
});
