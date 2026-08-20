/**
 * The write that puts bytes in a private bucket. What is checked here is the
 * order in which it does things, because every ordering mistake in this action
 * leaves something behind that nothing can clean up: bytes uploaded for a note
 * the caller does not own, an object with no row pointing at it, or a row
 * created for a file that was never stored.
 */
import { prisma } from '@byte-of-me/db';
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as Module from './upload-note-document';

import { MAX_DOCUMENT_SIZE_BYTES } from '@/entities/note-document/model/document-constraints';
import { privateStorage } from '@/shared/api/s3-storage-api';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let uploadNoteDocument: typeof Module.uploadNoteDocument;

const noteFindFirst = mock();
Object.defineProperty(prisma, 'note', {
  value: { findFirst: noteFindFirst },
  writable: true,
  configurable: true,
});

const create = mock();
Object.defineProperty(prisma, 'noteDocument', {
  value: { create },
  writable: true,
  configurable: true,
});

// `Storage.uploadFile` lives on the prototype, so it is replaced the same way
// a Prisma delegate is rather than with `spyOn`.
const uploadFile = mock();
const deleteFile = mock();
Object.defineProperty(privateStorage, 'uploadFile', {
  value: uploadFile,
  writable: true,
  configurable: true,
});
Object.defineProperty(privateStorage, 'deleteFile', {
  value: deleteFile,
  writable: true,
  configurable: true,
});

beforeAll(async () => {
  ({ uploadNoteDocument } = await import('./upload-note-document'));
});

function pdf(name = 'paper.pdf', size = 2048): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

function formDataWith(file: File): FormData {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

describe('uploadNoteDocument', () => {
  beforeEach(() => {
    noteFindFirst.mockReset().mockResolvedValue({ id: 'note-1' });
    create.mockReset().mockImplementation(() =>
      Promise.resolve({
        id: 'doc-1',
        title: 'paper.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        createdAt: new Date('2026-08-20T10:00:00Z'),
      })
    );
    uploadFile.mockReset().mockResolvedValue({ fileKey: 'ignored' });
    deleteFile.mockReset().mockResolvedValue({});
  });

  afterAll(resetTestUser);

  // The security boundary. Without it this action is an open endpoint that
  // writes to a bucket.
  it('refuses a caller who is not the site owner', async () => {
    setTestUser(null);

    await expect(
      uploadNoteDocument('note-1', formDataWith(pdf()))
    ).rejects.toThrow();
    expect(uploadFile).not.toHaveBeenCalled();

    resetTestUser();
  });

  // A foreign note is reported exactly as a missing one. Saying "forbidden"
  // would confirm the note exists, which is the fact the caller was fishing
  // for — and it must not have cost them an object in this owner's prefix
  // either, so the ownership check runs before the upload.
  it('reports a note this owner does not have as not found, storing nothing', async () => {
    noteFindFirst.mockResolvedValue(null);

    const res = await uploadNoteDocument('someone-elses', formDataWith(pdf()));

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBe('Note not found');
    expect(res.errorMsg).not.toMatch(/forbidden|denied|permission/i);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();

    const where = noteFindFirst.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(where.ownerId).toBe('admin-1');
  });

  it('rejects a file over the ceiling before any note lookup or upload', async () => {
    const res = await uploadNoteDocument(
      'note-1',
      formDataWith(pdf('huge.pdf', MAX_DOCUMENT_SIZE_BYTES + 1))
    );

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toContain('huge.pdf');
    expect(noteFindFirst).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('rejects anything that is not a PDF', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new File([new Uint8Array(10)], 'shot.png', { type: 'image/png' })
    );

    const res = await uploadNoteDocument('note-1', formData);

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toContain('shot.png');
    expect(uploadFile).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  // `FormData.get` answers `File | string | null`, and a caller posting a
  // plain text field named `file` would otherwise reach `file.size` on a
  // string — a crash, reported as an unhandled server error.
  it('rejects a request whose `file` entry is not a file', async () => {
    const formData = new FormData();
    formData.append('file', 'not-a-file');

    const res = await uploadNoteDocument('note-1', formData);

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  // The key is the object's whole identity: owner first so an account's
  // objects list by prefix, note second so an orphan sweep can be scoped, and
  // no author-supplied file name anywhere in it.
  it('stores under users/<ownerId>/notes/<noteId>/<id>.pdf and records that key', async () => {
    await uploadNoteDocument('note-1', formDataWith(pdf('My Report (v2).pdf')));

    const uploaded = uploadFile.mock.calls[0]?.[0] as {
      fileKey: string;
      contentType: string;
    };
    expect(uploaded.fileKey).toMatch(
      /^users\/admin-1\/notes\/note-1\/[23456789abcdefghjkmnpqrstuvwxyz]{12}\.pdf$/
    );
    expect(uploaded.fileKey).not.toContain('My Report');
    expect(uploaded.contentType).toBe('application/pdf');

    // The row has to point at the object that was actually written — two
    // calls to the key generator would give a row nothing can serve.
    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.fileKey).toBe(uploaded.fileKey);
    expect(data.ownerId).toBe('admin-1');
    expect(data.noteId).toBe('note-1');
    // The file name survives as the display label, where renaming is free.
    expect(data.title).toBe('My Report (v2).pdf');
  });

  it('uploads the bytes before creating the row', async () => {
    let uploadsAtCreate = -1;
    create.mockImplementation(() => {
      uploadsAtCreate = uploadFile.mock.calls.length;
      return Promise.resolve({
        id: 'doc-1',
        title: 'paper.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        createdAt: new Date('2026-08-20T10:00:00Z'),
      });
    });

    const res = await uploadNoteDocument('note-1', formDataWith(pdf()));

    expect(uploadsAtCreate).toBe(1);
    expect(res.success).toBe(true);
    if (!res.success) throw new Error('unreachable');
    expect(res.data.id).toBe('doc-1');
  });

  // The row is what makes an object reachable. A create that fails after the
  // upload leaves bytes nothing can name, in a bucket with no lifecycle rule.
  it('removes the object when the row cannot be created', async () => {
    create.mockRejectedValue(new Error('unique constraint'));

    const res = await uploadNoteDocument('note-1', formDataWith(pdf()));

    expect(res.success).toBe(false);
    const uploadedKey = (uploadFile.mock.calls[0]?.[0] as { fileKey: string })
      .fileKey;
    expect(deleteFile).toHaveBeenCalledWith(uploadedKey);
  });

  it('reports a storage failure via errorMsg rather than throwing', async () => {
    uploadFile.mockRejectedValue(new Error('S3 unavailable'));

    const res = await uploadNoteDocument('note-1', formDataWith(pdf()));

    expect(res.success).toBe(false);
    if (res.success) throw new Error('unreachable');
    expect(res.errorMsg).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });
});
