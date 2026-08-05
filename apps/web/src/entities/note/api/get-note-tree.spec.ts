/**
 * `getNoteTree` is a `'use server'` action; `apps/web/next-runtime-stubs.ts`
 * supplies the virtual modules it reaches (`server-only`, `next/cache`).
 * What this spec defends is the action's own contract: that the tree query is
 * owner-scoped, that it never ships note documents to draw a list of titles,
 * and that a failure surfaces through `errorMsg`.
 *
 * The `note` delegate is replaced wholesale rather than spied on: Prisma 7
 * synthesizes a fresh function per method access, so `spyOn(prisma.note, ...)`
 * patches a value the client never reads back.
 *
 * No `GlobalRegistrator.unregister()` dance here, unlike
 * `get-paginated-public-blogs.spec.ts`. That spec needs it because its action
 * reaches `@/shared/api/public-action-template`, which imports
 * `@/shared/config/env.ts` (t3-env) — t3-env's `onInvalidAccess` guard checks
 * `typeof window` and throws on a server-only key once happy-dom's `window`
 * is registered globally. `getNoteTree`'s import graph (`@byte-of-me/db`,
 * `@byte-of-me/logger`, `@/shared/lib/auth` — stubbed, `@/shared/lib/utils`)
 * never reaches that env module, so there is nothing to drop the DOM global
 * for. Confirmed empirically: adding the dance here makes this spec collide
 * with the blog spec's own `unregister()` when both run in the same `bun
 * test` process (`GlobalRegistrator` is process-global, not per-file) —
 * whichever file's `beforeAll` runs second throws "Failed to unregister.
 * Happy DOM has not previously been globally registered." Only one spec in
 * the whole suite may call `unregister()`; it stays the blog spec's, which
 * actually needs it.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetNoteTreeModule from './get-note-tree';

let getNoteTree: typeof GetNoteTreeModule.getNoteTree;

beforeAll(async () => {
  ({ getNoteTree } = await import('./get-note-tree'));
});

const findMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { findMany },
  writable: true,
  configurable: true,
});

const noteRow = {
  id: 'note-1',
  title: 'Reading list',
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  status: 'draft',
  isFolder: false,
  labels: [{ labelId: 'label-1' }],
  _count: { children: 0 },
};

describe('getNoteTree', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([noteRow]);
  });

  it('returns a success envelope carrying the tree rows', async () => {
    const res = await getNoteTree();

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.title).toBe('Reading list');
  });

  it('scopes the query to the calling owner', async () => {
    await getNoteTree();

    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.ownerId).toBe('admin-1');
  });

  it('excludes archived notes unless asked for them', async () => {
    await getNoteTree();
    expect(
      (findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>).archivedAt
    ).toBeNull();

    findMany.mockClear();
    await getNoteTree(true);
    expect(
      (findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>).archivedAt
    ).toBeUndefined();
  });

  it('orders by pin, position, title, then id as a final tiebreaker', async () => {
    // `position` is derived from a separate read in `createNote`, so two
    // concurrent creates under the same parent can land on the same
    // position with the same default title (`t('untitled')`) — an exact
    // three-way tie on `[isPinned, position, title]` that Postgres is free
    // to order differently between requests without a final, unique-valued
    // key. `id` is that key. This asserts the exact `orderBy` array reaching
    // Prisma, not just that the call succeeds — a regression that dropped
    // the sort entirely (or dropped just the `id` tiebreaker) would
    // otherwise pass every other test in this file.
    await getNoteTree();

    const orderBy = findMany.mock.calls[0]?.[0]?.orderBy;
    expect(orderBy).toEqual([
      { isPinned: 'desc' },
      { position: 'asc' },
      { title: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('never selects the note documents', async () => {
    await getNoteTree();

    const select = findMany.mock.calls[0]?.[0]?.select as Record<string, unknown>;
    expect(select.content).toBeUndefined();
    expect(select.plainText).toBeUndefined();
    expect(select.title).toBe(true);
  });

  it('reports failure through errorMsg, never error', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getNoteTree();

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
