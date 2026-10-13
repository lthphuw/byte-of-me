/**
 * A refused caller rejects the call instead of receiving an envelope. The guard
 * sits above the `try` in every media action (AGENTS §8), so the refusal never
 * reaches Prisma or storage.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { deleteMedia } from './delete-media';
import { finalizeVideoUpload } from './finalize-video-upload';
import { getPaginatedMedia } from './get-paginated-media';
import { prepareVideoUpload } from './prepare-video-upload';
import { uploadMedia } from './upload-media';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const MEDIA_ID = 'cl9ebqhxk00003b600tymydho';
const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'a.png', {
  type: 'image/png',
});

beforeEach(() => {
  setTestUser({ id: 'user-other', role: 'USER', email: 'visitor@example.com' });
});

afterEach(() => {
  resetTestUser();
});

describe('media actions refuse a non-admin by rejecting', () => {
  it('deleteMedia', async () => {
    await expect(deleteMedia(MEDIA_ID)).rejects.toThrow('Unauthorized');
  });

  it('getPaginatedMedia', async () => {
    await expect(getPaginatedMedia({ page: 1, limit: 12 })).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('uploadMedia', async () => {
    await expect(uploadMedia([png], 'blog')).rejects.toThrow('Unauthorized');
  });

  it('prepareVideoUpload', async () => {
    await expect(
      prepareVideoUpload({
        fileName: 'clip.mp4',
        mimeType: 'video/mp4',
        size: 1024,
        scope: 'featured-work',
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('finalizeVideoUpload', async () => {
    await expect(
      finalizeVideoUpload({
        fileKey: 'users/admin-1/media/featured-work/2026/10/abc.mp4',
        fileName: 'clip.mp4',
      })
    ).rejects.toThrow('Unauthorized');
  });
});
