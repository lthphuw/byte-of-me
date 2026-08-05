/**
 * `getNotesPage` is the flat view's read: one cursor-paginated list of
 * documents, sorted by the author's chosen order. What this defends:
 *
 * - `isFolder: false` is not optional. The flat view lists documents; the
 *   `documentsOnly` filter the panel applies client-side today only worked
 *   because the client held the whole corpus. Once the list is a window, a
 *   folder that slips into the query burns a slot in the page AND cannot be
 *   filtered out afterwards without leaving short pages behind.
 * - The order is TOTAL. Pinned first, then the chosen sort, then `id` — a
 *   cursor into a non-total order skips or repeats rows whenever two notes tie
 *   (and `updatedAt` ties constantly: a bulk edit stamps them identically).
 * - The page probe: `limit + 1` rows asked for, the extra popped, so a next
 *   page is detected without a second `count` query.
 *
 * The delegate is replaced wholesale rather than spied on, for the reason
 * `get-note-tree.spec.ts` records: Prisma 7 synthesizes a fresh function per
 * method access. `requireAdmin` is stubbed globally to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetNotesPageModule from './get-notes-page';

let getNotesPage: typeof GetNotesPageModule.getNotesPage;

beforeAll(async () => {
  ({ getNotesPage } = await import('./get-notes-page'));
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

describe('getNotesPage', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([row('a')]);
  });

  it('scopes to the owner', async () => {
    await getNotesPage({ sort: 'updated' });

    expect(argsOf().where.ownerId).toBe('admin-1');
  });

  it('lists documents only, never folders', async () => {
    await getNotesPage({ sort: 'updated' });

    // Filtering folders out after the fact would leave short pages: the probe
    // counts rows the caller never sees.
    expect(argsOf().where.isFolder).toBe(false);
  });

  it('does not scope to a parent — the flat view spans the whole corpus', async () => {
    await getNotesPage({ sort: 'updated' });

    expect('parentId' in argsOf().where).toBe(false);
  });

  it('excludes archived notes unless asked for them', async () => {
    await getNotesPage({ sort: 'updated' });
    expect(argsOf().where.archivedAt).toBeNull();

    findMany.mockClear();
    await getNotesPage({ sort: 'updated', includeArchived: true });
    expect(argsOf().where.archivedAt).toBeUndefined();
  });

  it('never selects the note documents', async () => {
    await getNotesPage({ sort: 'updated' });

    expect(argsOf().select.content).toBeUndefined();
    expect(argsOf().select.plainText).toBeUndefined();
    expect(argsOf().select.title).toBe(true);
  });

  it('orders pinned first, then by the chosen sort, then by id', async () => {
    await getNotesPage({ sort: 'updated' });
    expect(argsOf().orderBy).toEqual([
      { isPinned: 'desc' },
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);

    findMany.mockClear();
    await getNotesPage({ sort: 'created' });
    expect(argsOf().orderBy).toEqual([
      { isPinned: 'desc' },
      { createdAt: 'desc' },
      { id: 'asc' },
    ]);

    findMany.mockClear();
    await getNotesPage({ sort: 'title' });
    expect(argsOf().orderBy).toEqual([
      { isPinned: 'desc' },
      { title: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('falls back to a known order when handed an unknown sort', async () => {
    // A server action is an addressable endpoint, so `sort` can arrive as
    // anything. Indexing the map blindly would hand Prisma `undefined` and
    // turn a bad argument into a 500 instead of a page.
    await getNotesPage({
      sort: 'nonsense' as GetNotesPageModule.GetNotesPageInput['sort'],
    });

    expect(argsOf().orderBy).toEqual([
      { isPinned: 'desc' },
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);
  });

  it('asks for one row more than the page size', async () => {
    await getNotesPage({ sort: 'updated', limit: 10 });
    expect(argsOf().take).toBe(11);
  });

  it('reports a next cursor and hides the probe row when a page is full', async () => {
    findMany.mockResolvedValue([row('a'), row('b'), row('c')]);

    const res = await getNotesPage({ sort: 'updated', limit: 2 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(res.data.nextCursor).toBe('b');
  });

  it('reports no next cursor when the list is exhausted', async () => {
    findMany.mockResolvedValue([row('a'), row('b')]);

    const res = await getNotesPage({ sort: 'updated', limit: 5 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows).toHaveLength(2);
    expect(res.data.nextCursor).toBeNull();
  });

  it('passes the cursor to Prisma exclusively', async () => {
    await getNotesPage({ sort: 'updated', cursor: 'note-9' });

    expect(argsOf().cursor).toEqual({ id: 'note-9' });
    // Without `skip: 1` the cursor row itself comes back again and every page
    // after the first repeats its predecessor's last row.
    expect(argsOf().skip).toBe(1);
  });

  it('omits cursor and skip entirely on the first page', async () => {
    await getNotesPage({ sort: 'updated', cursor: null });

    expect(argsOf().cursor).toBeUndefined();
    expect(argsOf().skip).toBeUndefined();
  });

  it('clamps the page size', async () => {
    await getNotesPage({ sort: 'updated', limit: 100000 });
    expect(argsOf().take).toBeLessThanOrEqual(201);

    findMany.mockClear();
    await getNotesPage({ sort: 'updated', limit: 0 });
    expect(argsOf().take).toBeGreaterThan(1);
  });

  it('maps label joins and the child count onto each row', async () => {
    findMany.mockResolvedValue([
      row('a', { labels: [{ labelId: 'l1' }], _count: { children: 3 } }),
    ]);

    const res = await getNotesPage({ sort: 'updated' });

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

    const res = await getNotesPage({ sort: 'updated' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
