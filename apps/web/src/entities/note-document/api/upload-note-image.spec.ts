/**
 * The write that closes the hole. Every image ever pasted into a private note
 * went to the PUBLIC bucket before this action existed, so what is pinned here
 * is that it does not any more: which storage instance is used, that the type
 * allowlist refuses an SVG, and that what comes back is an app route rather
 * than anything resembling a bucket URL.
 */
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type * as Module from './upload-note-image';

import { MAX_INLINE_IMAGE_SIZE_BYTES } from '@/entities/note-document/model/document-constraints';
import { privateStorage, supabaseStorage } from '@/shared/api/s3-storage-api';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

let uploadNoteImage: typeof Module.uploadNoteImage;

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

// The instance this action must NEVER reach. Replaced so that touching it is a
// visible call rather than a real request to a public bucket.
const publicUploadFile = mock();
Object.defineProperty(supabaseStorage, 'uploadFile', {
  value: publicUploadFile,
  writable: true,
  configurable: true,
});

beforeAll(async () => {
  ({ uploadNoteImage } = await import('./upload-note-image'));
});

afterAll(resetTestUser);

function image(name = 'shot.png', type = 'image/png', size = 2048): File {
  return new File([new Uint8Array(size)], name, { type });
}

function formDataWith(file: File): FormData {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

describe('uploadNoteImage', () => {
  beforeEach(() => {
    resetTestUser();
    noteFindFirst.mockReset().mockResolvedValue({ id: 'note-1' });
    create.mockReset().mockResolvedValue({ id: 'doc-9' });
    uploadFile.mockReset().mockResolvedValue({ fileKey: 'k' });
    deleteFile.mockReset().mockResolvedValue(undefined);
    publicUploadFile.mockReset();
  });

  it('refuses an unauthenticated caller before anything is written', async () => {
    setTestUser(null);

    await expect(
      uploadNoteImage('note-1', formDataWith(image()))
    ).rejects.toThrow();

    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('stores in the PRIVATE bucket and never the public one', async () => {
    await uploadNoteImage('note-1', formDataWith(image()));

    expect(uploadFile).toHaveBeenCalledTimes(1);
    // The whole reason this action exists.
    expect(publicUploadFile).not.toHaveBeenCalled();
  });

  it('answers with an app route, not an address in a bucket', async () => {
    const res = await uploadNoteImage('note-1', formDataWith(image()));

    expect(res).toEqual({ success: true, data: '/api/notes/documents/doc-9' });
  });

  it('marks the row INLINE so the Files panel does not list it', async () => {
    await uploadNoteImage('note-1', formDataWith(image()));

    expect(create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ kind: 'INLINE', noteId: 'note-1' })
    );
  });

  it('takes the key extension from the MIME type, never from the name', async () => {
    // The editor's auto-upload builds its File as `new File([blob], 'image')`
    // — no extension in the name at all.
    await uploadNoteImage('note-1', formDataWith(image('image', 'image/jpeg')));

    expect(uploadFile.mock.calls[0][0].fileKey).toMatch(
      /^users\/admin-1\/notes\/note-1\/[23456789abcdefghjkmnpqrstuvwxyz]{12}\.jpg$/
    );
  });

  it('refuses an SVG, which same-origin can carry script', async () => {
    const res = await uploadNoteImage(
      'note-1',
      formDataWith(image('logo.svg', 'image/svg+xml'))
    );

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('refuses an oversized image before any upload', async () => {
    const res = await uploadNoteImage(
      'note-1',
      formDataWith(
        image('huge.png', 'image/png', MAX_INLINE_IMAGE_SIZE_BYTES + 1)
      )
    );

    expect(res.success).toBe(false);
    expect(noteFindFirst).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('reports a note it does not own exactly as a missing one', async () => {
    noteFindFirst.mockResolvedValue(null);

    const res = await uploadNoteImage('note-1', formDataWith(image()));

    expect(res).toEqual({ success: false, errorMsg: 'Note not found' });
    // Nothing was written into this owner's prefix on the way to being
    // refused.
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('removes the object when the row never lands', async () => {
    create.mockRejectedValue(new Error('db down'));

    const res = await uploadNoteImage('note-1', formDataWith(image()));

    expect(res.success).toBe(false);
    expect(deleteFile).toHaveBeenCalledWith(
      uploadFile.mock.calls[0][0].fileKey
    );
  });
});
