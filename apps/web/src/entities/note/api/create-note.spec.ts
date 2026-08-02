/**
 * `createNote` is the only untested write on this branch. What this spec
 * defends is the action's own contract: the write is owner-scoped, the note
 * is seeded with an empty Tiptap DOCUMENT (not an empty string — the editor
 * and `toEditorContent()` both expect valid Tiptap JSON, never a raw `''`),
 * `position` is derived from the last sibling under the same parent rather
 * than trusted from the caller, and an invalid title is rejected through
 * `errorMsg` before any query runs.
 *
 * The `note` delegate is replaced wholesale rather than spied on: Prisma 7
 * synthesizes a fresh function per method access, so `spyOn(prisma.note,
 * ...)` patches a value the client never reads back. No
 * `GlobalRegistrator.unregister()` here — see `get-note-tree.spec.ts`'s own
 * comment for why: `createNote`'s import graph never reaches `env.ts`, so
 * there is nothing to drop the DOM global for, and only one spec in the
 * whole suite may call `unregister()`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as CreateNoteModule from './create-note';

let createNote: typeof CreateNoteModule.createNote;

beforeAll(async () => {
  ({ createNote } = await import('./create-note'));
});

const findFirst = mock();
const create = mock();
Object.defineProperty(prisma, 'note', {
  value: { findFirst, create },
  writable: true,
  configurable: true,
});

const createdRow = {
  id: 'note-new',
  title: 'Reading list',
  content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
  parentId: null,
  position: 0,
  isPinned: false,
  archivedAt: null,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
};

describe('createNote', () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
    create.mockReset().mockResolvedValue(createdRow);
  });

  it('scopes the write to the calling owner', async () => {
    await createNote({ title: 'Reading list' });

    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.ownerId).toBe('admin-1');
  });

  it('seeds an empty Tiptap document, not an empty string', async () => {
    await createNote({ title: 'Reading list' });

    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.content).not.toBe('');
    expect(() => JSON.parse(data.content as string)).not.toThrow();
    expect(JSON.parse(data.content as string)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });

  it('derives position from the last sibling under the same parent', async () => {
    findFirst.mockResolvedValue({ position: 4 });

    await createNote({ title: 'Reading list', parentId: 'parent-1' });

    const findFirstArgs = findFirst.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
    };
    expect(findFirstArgs.where.ownerId).toBe('admin-1');
    expect(findFirstArgs.where.parentId).toBe('parent-1');
    expect(findFirstArgs.orderBy).toEqual({ position: 'desc' });

    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.position).toBe(5);
  });

  it('starts a note with no siblings at position 0', async () => {
    findFirst.mockResolvedValue(null);

    await createNote({ title: 'Reading list' });

    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.position).toBe(0);
  });

  it('rejects an empty title through errorMsg without touching the database', async () => {
    const res = await createNote({ title: '' });

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
