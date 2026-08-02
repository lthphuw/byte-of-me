/**
 * `getAdminNoteById` is the only read that returns note BODIES — the editor
 * loads a document through it rather than reusing a `getNoteTree` row (see
 * that action's own comment: `getNoteTree` deliberately drops `content`). Its
 * `ownerId` filter is the property this whole feature exists to have: notes
 * are never public, and `requireAdmin()` alone does not stop one admin from
 * reading another admin's notes if the schema ever permits more than one.
 * What this spec defends: the read is owner-scoped, it returns `content`, an
 * invalid id is rejected before any query runs, and a failure surfaces
 * through `errorMsg` — never a field named `error`.
 *
 * The `note` delegate is replaced wholesale rather than spied on: Prisma 7
 * synthesizes a fresh function per method access, so `spyOn(prisma.note,
 * ...)` patches a value the client never reads back. No
 * `GlobalRegistrator.unregister()` here — see `get-note-tree.spec.ts`'s own
 * comment for why: this action's import graph never reaches `env.ts`, so
 * there is nothing to drop the DOM global for, and only one spec in the
 * whole suite may call `unregister()`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as GetAdminNoteByIdModule from './get-admin-note-by-id';

let getAdminNoteById: typeof GetAdminNoteByIdModule.getAdminNoteById;

beforeAll(async () => {
  ({ getAdminNoteById } = await import('./get-admin-note-by-id'));
});

const findFirstOrThrow = mock();
Object.defineProperty(prisma, 'note', {
  value: { findFirstOrThrow },
  writable: true,
  configurable: true,
});

const noteRow = {
  id: 'note-1',
  title: 'Kafka internals',
  content: JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'rebalance' }] },
    ],
  }),
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('getAdminNoteById', () => {
  beforeEach(() => {
    findFirstOrThrow.mockReset().mockResolvedValue(noteRow);
  });

  it('scopes the read to the calling owner', async () => {
    await getAdminNoteById('note-1');

    const where = findFirstOrThrow.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(where.ownerId).toBe('admin-1');
    expect(where.id).toBe('note-1');
  });

  it('returns the document content', async () => {
    const res = await getAdminNoteById('note-1');

    // The mock resolves with a fixed row regardless of `select`, so this
    // alone would not catch a narrowed `select` the way a real Prisma call
    // would — the `select` argument itself is asserted separately below.
    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.content).toBe(noteRow.content);

    const select = findFirstOrThrow.mock.calls[0]?.[0]?.select as Record<
      string,
      unknown
    >;
    expect(select.content).toBe(true);
  });

  it('rejects an empty id through errorMsg before querying', async () => {
    const res = await getAdminNoteById('');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findFirstOrThrow).not.toHaveBeenCalled();
  });

  it('reports failure through errorMsg, never through a field named error', async () => {
    findFirstOrThrow.mockRejectedValue(new Error('No Note found'));

    const res = await getAdminNoteById('missing');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect((res as { error?: unknown }).error).toBeUndefined();
  });
});
