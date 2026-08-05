/**
 * `getNoteChildren` replaces `getNoteTree`'s whole-corpus fetch with one level
 * at a time. What this defends:
 *
 * - `parentId: null` means THE ROOT LEVEL, not "any parent". Getting that
 *   wrong returns the entire corpus and silently undoes the change.
 * - The page probe: the action asks Prisma for `limit + 1` rows and pops the
 *   extra. That is how it learns a next page exists without a second `count`,
 *   and the extra row must never reach the caller.
 * - The cursor is exclusive (`skip: 1`), or every page repeats its first row.
 *
 * The delegate is replaced wholesale rather than spied on, for the reason
 * `get-note-tree.spec.ts` records: Prisma 7 synthesizes a fresh function per
 * method access. `requireAdmin` is stubbed globally to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetNoteChildrenModule from './get-note-children';

let getNoteChildren: typeof GetNoteChildrenModule.getNoteChildren;

beforeAll(async () => {
  ({ getNoteChildren } = await import('./get-note-children'));
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

describe('getNoteChildren', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([row('a')]);
  });

  it('scopes to the owner and to the requested level', async () => {
    await getNoteChildren({ parentId: 'folder-1' });

    expect(argsOf().where.ownerId).toBe('admin-1');
    expect(argsOf().where.parentId).toBe('folder-1');
  });

  it('treats a null parent as the ROOT level, not as "any parent"', async () => {
    await getNoteChildren({ parentId: null });

    // `parentId` must be present and null. Omitting it would match every note
    // the owner has — the exact whole-corpus read this action exists to end.
    expect('parentId' in argsOf().where).toBe(true);
    expect(argsOf().where.parentId).toBeNull();
  });

  it('excludes archived notes unless asked for them', async () => {
    await getNoteChildren({ parentId: null });
    expect(argsOf().where.archivedAt).toBeNull();

    findMany.mockClear();
    await getNoteChildren({ parentId: null, includeArchived: true });
    expect(argsOf().where.archivedAt).toBeUndefined();
  });

  it('never selects the note documents', async () => {
    await getNoteChildren({ parentId: null });

    expect(argsOf().select.content).toBeUndefined();
    expect(argsOf().select.plainText).toBeUndefined();
    expect(argsOf().select.title).toBe(true);
  });

  it('keeps the existing total order so the cursor is stable', async () => {
    await getNoteChildren({ parentId: null });

    // `id` last is what makes this a TOTAL order. Without it two rows tying on
    // [isPinned, position, title] could come back in either order between
    // requests, and a cursor into that is meaningless.
    expect(argsOf().orderBy).toEqual([
      { isPinned: 'desc' },
      { position: 'asc' },
      { title: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('asks for one row more than the page size', async () => {
    await getNoteChildren({ parentId: null, limit: 10 });
    expect(argsOf().take).toBe(11);
  });

  it('reports a next cursor and hides the probe row when a page is full', async () => {
    findMany.mockResolvedValue([row('a'), row('b'), row('c')]);

    const res = await getNoteChildren({ parentId: null, limit: 2 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(res.data.nextCursor).toBe('b');
  });

  it('reports no next cursor when the level is exhausted', async () => {
    findMany.mockResolvedValue([row('a'), row('b')]);

    const res = await getNoteChildren({ parentId: null, limit: 5 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows).toHaveLength(2);
    expect(res.data.nextCursor).toBeNull();
  });

  it('passes the cursor to Prisma exclusively', async () => {
    await getNoteChildren({ parentId: null, cursor: 'note-9' });

    expect(argsOf().cursor).toEqual({ id: 'note-9' });
    // Without `skip: 1` the cursor row itself comes back again and every page
    // after the first repeats its predecessor's last row.
    expect(argsOf().skip).toBe(1);
  });

  it('omits cursor and skip entirely on the first page', async () => {
    await getNoteChildren({ parentId: null });

    expect(argsOf().cursor).toBeUndefined();
    expect(argsOf().skip).toBeUndefined();
  });

  it('clamps the page size', async () => {
    await getNoteChildren({ parentId: null, limit: 100000 });
    expect(argsOf().take).toBeLessThanOrEqual(201);

    findMany.mockClear();
    await getNoteChildren({ parentId: null, limit: 0 });
    expect(argsOf().take).toBeGreaterThan(1);
  });

  it('maps label joins and the child count onto each row', async () => {
    findMany.mockResolvedValue([
      row('a', { labels: [{ labelId: 'l1' }], _count: { children: 3 } }),
    ]);

    const res = await getNoteChildren({ parentId: null });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows[0]?.labelIds).toEqual(['l1']);
    expect(res.data.rows[0]?.childCount).toBe(3);
    // The raw Prisma shapes must not leak through to consumers.
    expect((res.data.rows[0] as Record<string, unknown>)._count).toBeUndefined();
    expect((res.data.rows[0] as Record<string, unknown>).labels).toBeUndefined();
  });

  it('reports failure through errorMsg, never error', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getNoteChildren({ parentId: null });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
