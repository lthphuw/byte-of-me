/**
 * `getArchivedNotes` is the trash's own read, and it exists because
 * `getNoteChildren` cannot serve that view at all.
 *
 * `includeArchived` is INCLUDE, not ONLY, and `archiveNote` cascades DOWN a
 * subtree — so the common case, archiving a note that lived inside a live
 * folder, produces an archived row whose parent is NOT archived. That row
 * belongs to no `parentId: null` level, so a per-level read loses it. The
 * trash is therefore a flat list ordered by when things were archived, which
 * is also what a wastebasket actually is.
 *
 * Delegate replaced wholesale rather than spied on, per
 * `get-note-tree.spec.ts`; `requireAdmin` is stubbed globally to `admin-1`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetArchivedNotesModule from './get-archived-notes';

let getArchivedNotes: typeof GetArchivedNotesModule.getArchivedNotes;

beforeAll(async () => {
  ({ getArchivedNotes } = await import('./get-archived-notes'));
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
  archivedAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  status: 'draft',
  isFolder: false,
  labels: [],
  _count: { children: 0 },
  ...over,
});

const argsOf = () =>
  findMany.mock.calls[0]?.[0] as {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
    orderBy: unknown;
    take: number;
    cursor?: { id: string };
    skip?: number;
  };

describe('getArchivedNotes', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([row('a')]);
  });

  it('scopes to the owner', async () => {
    await getArchivedNotes({});
    expect(argsOf().where.ownerId).toBe('admin-1');
  });

  it('returns ONLY archived notes', async () => {
    await getArchivedNotes({});

    // `archivedAt: { not: null }` — not `undefined`, which would return the
    // whole corpus, and not `null`, which would return only live ones. This
    // is the exact distinction that made `getNoteTree(true)` unusable here.
    expect(argsOf().where.archivedAt).toEqual({ not: null });
  });

  it('does not filter by parent — the trash spans every level', async () => {
    await getArchivedNotes({});

    // An archived note can have a LIVE parent, so any `parentId` constraint
    // would silently hide most of what the author just archived.
    expect('parentId' in argsOf().where).toBe(false);
  });

  it('never selects the note documents', async () => {
    await getArchivedNotes({});

    expect(argsOf().select.content).toBeUndefined();
    expect(argsOf().select.plainText).toBeUndefined();
    expect(argsOf().select.title).toBe(true);
  });

  it('orders most recently archived first, with id as the tiebreaker', async () => {
    await getArchivedNotes({});

    // `id` last makes the order TOTAL: archiving a folder stamps its whole
    // subtree in one transaction, so ties on `archivedAt` are the norm here,
    // and a cursor into a non-total order skips or repeats rows.
    expect(argsOf().orderBy).toEqual([
      { archivedAt: 'desc' },
      { id: 'asc' },
    ]);
  });

  it('asks for one row more than the page size', async () => {
    await getArchivedNotes({ limit: 10 });
    expect(argsOf().take).toBe(11);
  });

  it('reports a next cursor and hides the probe row on a full page', async () => {
    findMany.mockResolvedValue([row('a'), row('b'), row('c')]);

    const res = await getArchivedNotes({ limit: 2 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(res.data.nextCursor).toBe('b');
  });

  it('reports no next cursor when the trash is exhausted', async () => {
    findMany.mockResolvedValue([row('a')]);

    const res = await getArchivedNotes({ limit: 5 });

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.nextCursor).toBeNull();
  });

  it('passes the cursor exclusively', async () => {
    await getArchivedNotes({ cursor: 'note-9' });

    expect(argsOf().cursor).toEqual({ id: 'note-9' });
    expect(argsOf().skip).toBe(1);
  });

  it('clamps the page size', async () => {
    await getArchivedNotes({ limit: 100000 });
    expect(argsOf().take).toBeLessThanOrEqual(201);
  });

  it('maps label joins and the child count onto each row', async () => {
    findMany.mockResolvedValue([
      row('a', { labels: [{ labelId: 'l1' }], _count: { children: 2 } }),
    ]);

    const res = await getArchivedNotes({});

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.rows[0]?.labelIds).toEqual(['l1']);
    expect(res.data.rows[0]?.childCount).toBe(2);
    expect((res.data.rows[0] as Record<string, unknown>)._count).toBeUndefined();
  });

  it('reports failure through errorMsg, never error', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getArchivedNotes({});

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
