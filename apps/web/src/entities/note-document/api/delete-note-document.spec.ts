/**
 * Removing one attachment. The order is the contract: the ROW goes first and
 * the object after it.
 *
 * Object-first is the tempting order — it looks like "clean up the expensive
 * thing before the cheap one" — and it is the one failure mode the author
 * actually sees: a row still listed in the panel, opening a viewer that can
 * never load. Row-first can at worst strand bytes nothing points at.
 */
import { prisma } from '@byte-of-me/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as Module from './delete-note-document';

import { privateStorage } from '@/shared/api/s3-storage-api';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let deleteNoteDocument: typeof Module.deleteNoteDocument;

const findFirst = mock();
const deleteMany = mock();
Object.defineProperty(prisma, 'noteDocument', {
  value: { findFirst, deleteMany },
  writable: true,
  configurable: true,
});

const deleteFile = mock();
Object.defineProperty(privateStorage, 'deleteFile', {
  value: deleteFile,
  writable: true,
  configurable: true,
});

beforeAll(async () => {
  ({ deleteNoteDocument } = await import('./delete-note-document'));
});

const FILE_KEY = 'users/admin-1/notes/note-1/abc123def456.pdf';

describe('deleteNoteDocument', () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue({ id: 'doc-1', fileKey: FILE_KEY });
    deleteMany.mockReset().mockResolvedValue({ count: 1 });
    deleteFile.mockReset().mockResolvedValue({});
  });

  afterAll(resetTestUser);

  it('refuses a caller who is not the site owner', async () => {
    setTestUser(null);

    await expect(deleteNoteDocument('doc-1')).rejects.toThrow();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();

    resetTestUser();
  });

  // Somebody else's attachment is reported exactly as a missing one — a
  // NOT-FOUND, never a FORBIDDEN, because the second confirms the row exists.
  it('reports another owner’s attachment as not found, deleting nothing', async () => {
    findFirst.mockResolvedValue(null);

    const res = await deleteNoteDocument('someone-elses');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBe('Attachment not found');
    expect(res.errorMsg).not.toMatch(/forbidden|denied|permission/i);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();

    const where = findFirst.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.ownerId).toBe('admin-1');
  });

  it('keeps the owner scope on the write, not only on the read', async () => {
    await deleteNoteDocument('doc-1');

    const where = deleteMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(where.id).toBe('doc-1');
    expect(where.ownerId).toBe('admin-1');
  });

  it('deletes the row before the object', async () => {
    let writesAtObjectDelete = -1;
    deleteFile.mockImplementation(() => {
      writesAtObjectDelete = deleteMany.mock.calls.length;
      return Promise.resolve({});
    });

    const res = await deleteNoteDocument('doc-1');

    expect(writesAtObjectDelete).toBe(1);
    expect(deleteFile).toHaveBeenCalledWith(FILE_KEY);
    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    // The id back, so the caller drops that row without guessing which
    // mutation resolved.
    expect(res.data).toBe('doc-1');
  });

  // The row is already gone by then, so the delete DID succeed. Failing here
  // would tell the author their file survived when it did not.
  it('still succeeds when the object cannot be removed', async () => {
    deleteFile.mockRejectedValue(new Error('S3 unavailable'));

    const res = await deleteNoteDocument('doc-1');

    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data).toBe('doc-1');
  });

  // A concurrent delete got there first. Removing the object anyway could
  // strand the caller that is mid-flight on the same row.
  it('leaves the object alone when the row was already gone', async () => {
    deleteMany.mockResolvedValue({ count: 0 });

    const res = await deleteNoteDocument('doc-1');

    expect(res.success).toBe(false);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('rejects an empty id before it reaches the database', async () => {
    const res = await deleteNoteDocument('');

    expect(res.success).toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
