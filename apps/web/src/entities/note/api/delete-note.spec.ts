/**
 * `deleteNote` is a hard delete, and the database cascade is what destroys the
 * subtree. What is tested here is the other half — that the action can SAY
 * what it destroyed. Only the server can: a collapsed folder's subtree is not
 * in the browser, so an editor open on a descendant has no other way to learn
 * the note under it is gone (see `hasNoteBeenDeleted`).
 *
 * The rest is the boundary: the write stays owner-scoped, and a miss surfaces
 * as failure rather than a silent no-op success — matching `update-note.ts`
 * (`findFirstOrThrow`) and `move-note.ts` (`update`, which throws `P2025`).
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as DeleteNoteModule from './delete-note';

let deleteNote: typeof DeleteNoteModule.deleteNote;

beforeAll(async () => {
  ({ deleteNote } = await import('./delete-note'));
});

const findMany = mock();
const deleteMany = mock();
Object.defineProperty(prisma, 'note', {
  value: { findMany, deleteMany },
  writable: true,
  configurable: true,
});

describe('deleteNote', () => {
  beforeEach(() => {
    // note-1 → child-1 → grandchild-1, plus an unrelated root note.
    findMany.mockReset().mockResolvedValue([
      { id: 'note-1', parentId: null },
      { id: 'child-1', parentId: 'note-1' },
      { id: 'grandchild-1', parentId: 'child-1' },
      { id: 'other', parentId: null },
    ]);
    deleteMany.mockReset().mockResolvedValue({ count: 3 });
  });

  it('scopes the delete to the calling owner', async () => {
    await deleteNote('note-1');

    const where = deleteMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(where.ownerId).toBe('admin-1');
    // The read the ids come from is owner-scoped too, so nothing outside this
    // owner's rows can reach the id list in the first place.
    const readWhere = findMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(readWhere.ownerId).toBe('admin-1');
  });

  // The contract the editor depends on. Without it `remove.onSuccess` can
  // only name the row that was clicked, and deleting a FOLDER left the editor
  // open on a descendant that no longer exists — autosaving into it.
  it('names every id it deleted, target first', async () => {
    const res = await deleteNote('note-1');

    if (!res.success) throw new Error('unreachable');
    expect(res.data[0]).toBe('note-1');
    expect([...res.data].sort()).toEqual(['child-1', 'grandchild-1', 'note-1']);
  });

  // Collected BEFORE the rows are gone — the only ordering in which they can
  // be known at all. Asserted through the call log rather than by reading the
  // source: the read must have happened by the time the write is issued.
  it('reads the ids before issuing the delete', async () => {
    let readCallsAtWrite = -1;
    deleteMany.mockImplementation(() => {
      readCallsAtWrite = findMany.mock.calls.length;
      return Promise.resolve({ count: 3 });
    });

    await deleteNote('note-1');

    expect(readCallsAtWrite).toBe(1);
  });

  it('deletes the subtree, not the unrelated root note', async () => {
    await deleteNote('note-1');

    const where = deleteMany.mock.calls[0]?.[0]?.where as {
      id: { in: string[] };
    };
    expect([...where.id.in].sort()).toEqual([
      'child-1',
      'grandchild-1',
      'note-1',
    ]);
  });

  // An id absent from this owner's rows and an id owned by someone else look
  // identical from here — the read is already filtered by `ownerId`, so
  // membership is the only signal available, and it deliberately does not say
  // which case occurred (`moveNote` doesn't leak that difference either).
  it('reports failure via errorMsg when no note matches this owner', async () => {
    const res = await deleteNote('missing');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
