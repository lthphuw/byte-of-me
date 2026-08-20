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
 *
 * The attachment cleanup is tested here too, because the database cannot do
 * it: `NoteDocument.noteId` cascades the ROWS away and leaves the objects in
 * the private bucket with nothing left pointing at them.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as DeleteNoteModule from './delete-note';

import { privateStorage } from '@/shared/api/s3-storage-api';

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

const documentFindMany = mock();
Object.defineProperty(prisma, 'noteDocument', {
  value: { findMany: documentFindMany },
  writable: true,
  configurable: true,
});

// `Storage.deleteFile` lives on the prototype, so it is replaced the same way
// a Prisma delegate is rather than with `spyOn` — an own property shadowing
// the real method, which cannot reach S3 from a test in any case.
const deleteFile = mock();
Object.defineProperty(privateStorage, 'deleteFile', {
  value: deleteFile,
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
    // Two attachments on the target, one on a grandchild — the subtree, not
    // just the row that was clicked.
    documentFindMany
      .mockReset()
      .mockResolvedValue([
        { fileKey: 'users/admin-1/notes/note-1/a.pdf' },
        { fileKey: 'users/admin-1/notes/note-1/b.pdf' },
        { fileKey: 'users/admin-1/notes/grandchild-1/c.pdf' },
      ]);
    deleteFile.mockReset().mockResolvedValue({});
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
    // Nothing was destroyed, so nothing may be removed from the bucket
    // either — an object outlives a failed delete.
    expect(deleteFile).not.toHaveBeenCalled();
  });

  // The keys are read for the whole id set, not for the target alone: delete a
  // folder and every attachment beneath it becomes unreachable at the same
  // instant, so a query scoped to the clicked row would strand all of them.
  it('collects the attachment keys for the whole descendant set', async () => {
    await deleteNote('note-1');

    const where = documentFindMany.mock.calls[0]?.[0]?.where as {
      noteId: { in: string[] };
      ownerId: string;
    };
    expect([...where.noteId.in].sort()).toEqual([
      'child-1',
      'grandchild-1',
      'note-1',
    ]);
    expect(where.ownerId).toBe('admin-1');
  });

  // Read before the write, deleted after it. Before, because the cascade
  // removes the rows the keys live on; after, because an object removed ahead
  // of a write that then fails leaves a row pointing at nothing.
  it('reads the keys before the write and removes the objects after it', async () => {
    let readsAtWrite = -1;
    deleteMany.mockImplementation(() => {
      readsAtWrite = documentFindMany.mock.calls.length;
      return Promise.resolve({ count: 3 });
    });
    let writesAtFirstObjectDelete = -1;
    deleteFile.mockImplementation(() => {
      if (writesAtFirstObjectDelete < 0) {
        writesAtFirstObjectDelete = deleteMany.mock.calls.length;
      }
      return Promise.resolve({});
    });

    await deleteNote('note-1');

    expect(readsAtWrite).toBe(1);
    expect(writesAtFirstObjectDelete).toBe(1);
    expect(deleteFile.mock.calls.map((call) => call[0]).sort()).toEqual([
      'users/admin-1/notes/grandchild-1/c.pdf',
      'users/admin-1/notes/note-1/a.pdf',
      'users/admin-1/notes/note-1/b.pdf',
    ]);
  });

  // The rows are already gone by then, so the delete DID succeed. Reporting
  // failure would tell the author their note survived when it did not; the
  // orphaned object is a storage bill, not a correctness bug.
  it('still succeeds when removing an object fails', async () => {
    deleteFile.mockImplementation((key: string) =>
      key.endsWith('b.pdf')
        ? Promise.reject(new Error('S3 unavailable'))
        : Promise.resolve({})
    );

    const res = await deleteNote('note-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect([...res.data].sort()).toEqual(['child-1', 'grandchild-1', 'note-1']);
    // `allSettled`, not a sequential await: the failing key must not abandon
    // the two that would otherwise have been removed.
    expect(deleteFile).toHaveBeenCalledTimes(3);
  });

  it('touches storage not at all when the subtree has no attachments', async () => {
    documentFindMany.mockResolvedValue([]);

    const res = await deleteNote('note-1');

    expect(res.success).toBe(true);
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
