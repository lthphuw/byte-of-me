/**
 * The read behind the Files panel. Two contracts matter here and neither is
 * visible from the panel: the query is owner-scoped rather than trusting the
 * `noteId` it was handed, and `fileKey` never leaves the server — the object
 * lives in a private bucket, and a key on the wire is an invitation to build a
 * URL out of it.
 */
import { prisma } from '@byte-of-me/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as Module from './get-note-documents';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let getNoteDocuments: typeof Module.getNoteDocuments;

const findMany = mock();
Object.defineProperty(prisma, 'noteDocument', {
  value: { findMany },
  writable: true,
  configurable: true,
});

beforeAll(async () => {
  ({ getNoteDocuments } = await import('./get-note-documents'));
});

describe('getNoteDocuments', () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      {
        id: 'doc-1',
        title: 'paper.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        createdAt: new Date('2026-08-20T10:00:00Z'),
      },
    ]);
  });

  afterAll(resetTestUser);

  // The security boundary, not the layout guard. A server action is an
  // addressable endpoint and is callable without ever rendering the page.
  it('refuses a caller who is not the site owner', async () => {
    setTestUser(null);

    await expect(getNoteDocuments('note-1')).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();

    resetTestUser();
  });

  it('scopes the read to the calling owner', async () => {
    await getNoteDocuments('note-1');

    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.noteId).toBe('note-1');
    // Somebody else's note matches no rows: the caller cannot tell "no
    // attachments" from "not your note", and deliberately must not be able to.
    expect(where.ownerId).toBe('admin-1');
  });

  it('never selects the storage key', async () => {
    const res = await getNoteDocuments('note-1');

    const select = findMany.mock.calls[0]?.[0]?.select as Record<
      string,
      unknown
    >;
    expect(select.fileKey).toBeUndefined();
    if (!res.success) throw new Error('unreachable');
    expect(res.data[0]).not.toHaveProperty('fileKey');
  });

  it('reports failure via errorMsg rather than throwing', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    const res = await getNoteDocuments('note-1');

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
  });

  it('rejects an empty id before it reaches the database', async () => {
    const res = await getNoteDocuments('');

    expect(res.success).toBe(false);
    expect(findMany).not.toHaveBeenCalled();
  });
});
