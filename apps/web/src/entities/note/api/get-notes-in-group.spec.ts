/**
 * `getNotesInGroup` loads one bucket of the grouped view, one page at a time.
 * What this defends:
 *
 * - The bucket key round-trips: whatever `getNoteGroupSummaries` emitted as
 *   `key` must translate back into exactly the filter that produced its count,
 *   or the header's number and the rows below it describe different sets.
 * - A key that does not belong to the requested grouping is refused before a
 *   query runs, rather than degrading into "every note the owner has".
 * - The page probe (`limit + 1`) and the exclusive cursor (`skip: 1`) behave
 *   as they do in `get-note-children.ts` — same total order, same clamping.
 *
 * The delegate is replaced wholesale rather than spied on, for the reason
 * `get-note-tree.spec.ts` records: Prisma 7 synthesizes a fresh function per
 * method access. `requireAdmin` is stubbed globally to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetNotesInGroupModule from './get-notes-in-group';

let getNotesInGroup: typeof GetNotesInGroupModule.getNotesInGroup;

beforeAll(async () => {
  ({ getNotesInGroup } = await import('./get-notes-in-group'));
});

const findMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const row = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: id,
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  status: 'draft',
  isFolder: false,
  labels: [],
  _count: { children: 0 },
  ...over,
});

const argsOf = (call = 0) =>
  findMany.mock.calls[call]?.[0] as {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
    orderBy: unknown;
    take: number;
    cursor?: { id: string };
    skip?: number;
  };

describe('getNotesInGroup', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([row('a')]);
  });

  it('scopes to the owner and to documents only', async () => {
    await getNotesInGroup({ groupBy: 'status', key: 'status:draft' });

    expect(argsOf().where.ownerId).toBe('admin-1');
    // Same filter the summary counted with — a folder appearing here would
    // make the section longer than its own header claims.
    expect(argsOf().where.isFolder).toBe(false);
    expect(argsOf().where.archivedAt).toBeNull();
  });

  it('includes archived notes only when asked', async () => {
    await getNotesInGroup({
      groupBy: 'status',
      key: 'status:draft',
      includeArchived: true,
    });

    expect(argsOf().where.archivedAt).toBeUndefined();
  });

  it('filters by the status the key names', async () => {
    await getNotesInGroup({ groupBy: 'status', key: 'status:in progress' });

    // Everything after the first colon is the value: a status is free-form
    // author vocabulary and may contain colons, spaces, anything.
    expect(argsOf().where.status).toBe('in progress');
  });

  it('filters by the label the key names', async () => {
    await getNotesInGroup({ groupBy: 'label', key: 'label:l1' });

    // `some`, not an equality on a column: a note wears many labels and must
    // appear in each of their buckets, which is what `groupRows` did.
    expect(argsOf().where.labels).toEqual({ some: { labelId: 'l1' } });
  });

  it('filters the unlabeled bucket by the absence of join rows', async () => {
    await getNotesInGroup({ groupBy: 'label', key: 'no-label' });

    expect(argsOf().where.labels).toEqual({ none: {} });
  });

  it('refuses a key from the other grouping instead of listing everything', async () => {
    const res = await getNotesInGroup({
      groupBy: 'label',
      key: 'status:draft',
    });

    expect(res.success).toBe(false);
    // The danger is not the error — it is the fallback. An unparsed key that
    // simply contributed no `where` clause would return the whole corpus.
    expect(findMany).not.toHaveBeenCalled();
  });

  it('refuses a malformed key before touching the database', async () => {
    const empty = await getNotesInGroup({ groupBy: 'status', key: 'status:' });
    const junk = await getNotesInGroup({ groupBy: 'status', key: 'draft' });

    expect(empty.success).toBe(false);
    expect(junk.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('never selects the note documents', async () => {
    await getNotesInGroup({ groupBy: 'status', key: 'status:draft' });

    expect(argsOf().select.content).toBeUndefined();
    expect(argsOf().select.plainText).toBeUndefined();
    expect(argsOf().select.title).toBe(true);
  });

  it('keeps the existing total order so the cursor is stable', async () => {
    await getNotesInGroup({ groupBy: 'status', key: 'status:draft' });

    // Identical to `getNoteChildren`: `id` last is what makes the order total,
    // and a cursor into a non-total order skips or repeats rows.
    expect(argsOf().orderBy).toEqual([
      { isPinned: 'desc' },
      { position: 'asc' },
      { title: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('asks for one row more than the page size', async () => {
    await getNotesInGroup({
      groupBy: 'status',
      key: 'status:draft',
      limit: 10,
    });

    expect(argsOf().take).toBe(11);
  });

  it('reports a next cursor and hides the probe row when a page is full', async () => {
    findMany.mockResolvedValue([row('a'), row('b'), row('c')]);

    const res = await getNotesInGroup({
      groupBy: 'status',
      key: 'status:draft',
      limit: 2,
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(res.data.nextCursor).toBe('b');
  });

  it('reports no next cursor when the bucket is exhausted', async () => {
    findMany.mockResolvedValue([row('a'), row('b')]);

    const res = await getNotesInGroup({
      groupBy: 'status',
      key: 'status:draft',
      limit: 5,
    });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows).toHaveLength(2);
    expect(res.data.nextCursor).toBeNull();
  });

  it('passes the cursor to Prisma exclusively', async () => {
    await getNotesInGroup({
      groupBy: 'status',
      key: 'status:draft',
      cursor: 'note-9',
    });

    expect(argsOf().cursor).toEqual({ id: 'note-9' });
    expect(argsOf().skip).toBe(1);
  });

  it('omits cursor and skip entirely on the first page', async () => {
    await getNotesInGroup({ groupBy: 'status', key: 'status:draft' });

    expect(argsOf().cursor).toBeUndefined();
    expect(argsOf().skip).toBeUndefined();
  });

  it('clamps the page size', async () => {
    await getNotesInGroup({
      groupBy: 'status',
      key: 'status:draft',
      limit: 100000,
    });
    expect(argsOf().take).toBeLessThanOrEqual(201);

    findMany.mockClear();
    await getNotesInGroup({ groupBy: 'status', key: 'status:draft', limit: 0 });
    expect(argsOf().take).toBeGreaterThan(1);
  });

  it('maps label joins and the child count onto each row', async () => {
    findMany.mockResolvedValue([
      row('a', { labels: [{ labelId: 'l1' }], _count: { children: 3 } }),
    ]);

    const res = await getNotesInGroup({ groupBy: 'label', key: 'label:l1' });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows[0]?.labelIds).toEqual(['l1']);
    expect(res.data.rows[0]?.childCount).toBe(3);
    // The raw Prisma shapes must not leak through to consumers.
    expect(
      (res.data.rows[0] as Record<string, unknown>)._count
    ).toBeUndefined();
    expect(
      (res.data.rows[0] as Record<string, unknown>).labels
    ).toBeUndefined();
  });

  it('reports failure through errorMsg, never error', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getNotesInGroup({
      groupBy: 'status',
      key: 'status:draft',
    });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
