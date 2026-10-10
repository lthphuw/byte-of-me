/**
 * The two server halves of a direct clip upload. The signed URL cannot bound
 * size or content, so `finalizeVideoUpload` holds the stored object to the rules
 * and deletes what fails them. Storage and Prisma are replaced.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { finalizeVideoUpload } from './finalize-video-upload';
import { prepareVideoUpload } from './prepare-video-upload';

import { videoExtensionOfOwnKey } from '@/entities/media/model/media-file-key';
import { supabaseStorage } from '@/shared/api/s3-storage-api';

const mediaCreate = mock();
Object.defineProperty(prisma, 'media', {
  value: { create: mediaCreate },
  writable: true,
  configurable: true,
});

const presign = spyOn(supabaseStorage, 'getPresignedUploadUrl');
const getFile = spyOn(supabaseStorage, 'getFile');
const deleteFile = spyOn(supabaseStorage, 'deleteFile');
const getPublicUrl = spyOn(supabaseStorage, 'getPublicUrl');

const MiB = 1024 * 1024;
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const MP4 = new Uint8Array([
  ...[0, 0, 0, 24, ...ascii('ftypisom'), 0, 0, 2, 0, ...ascii('isom'), ...ascii('mp42')],
  ...[0, 0, 0, 8, ...ascii('free')],
]);
const HTML = new TextEncoder().encode('<html><script>alert(1)</script></html>');

const streamOf = (bytes: Uint8Array) =>
  new Response(bytes as BlobPart).body as ReadableStream;
const object = (bytes: Uint8Array, contentLength = bytes.byteLength) => ({
  body: streamOf(bytes),
  contentType: 'video/mp4',
  contentLength,
});

const KEY = 'users/admin-1/media/featured-work/2026/10/abc23456.mp4';

beforeEach(() => {
  presign.mockReset().mockResolvedValue('https://s3.example/put?sig=1');
  getFile.mockReset();
  deleteFile.mockReset().mockResolvedValue({} as never);
  getPublicUrl.mockReset().mockReturnValue('https://cdn.example/abc.mp4');
  mediaCreate.mockReset().mockImplementation(async ({ data }) => ({ id: 'm1', ...data }));
});

describe('videoExtensionOfOwnKey', () => {
  it('accepts only a video key under the caller\'s own media prefix', () => {
    expect(videoExtensionOfOwnKey('admin-1', KEY)).toBe('mp4');
    expect(videoExtensionOfOwnKey('admin-1', KEY.replace('.mp4', '.webm'))).toBe('webm');
    expect(videoExtensionOfOwnKey('other', KEY)).toBeNull();
    expect(videoExtensionOfOwnKey('admin-1', KEY.replace('.mp4', '.png'))).toBeNull();
    expect(
      videoExtensionOfOwnKey('admin-1', 'users/admin-1/media/../../other/x/2026/10/a.mp4')
    ).toBeNull();
  });
});

describe('prepareVideoUpload', () => {
  const request = { fileName: 'demo.mp4', mimeType: 'video/mp4', size: 7 * MiB, scope: 'featured-work' as const };

  it('signs a key under the admin\'s media prefix for the claimed type', async () => {
    const res = await prepareVideoUpload(request);

    expect(res.success).toBe(true);
    const key = (presign.mock.calls[0] as [string, number])[0];
    expect(videoExtensionOfOwnKey('admin-1', key)).toBe('mp4');
    expect(res.data).toEqual({ uploadUrl: 'https://s3.example/put?sig=1', fileKey: key });
  });

  it.each([
    ['a clip over 10 MB', { ...request, size: 10 * MiB + 1 }],
    ['a type that is not mp4/webm', { ...request, mimeType: 'video/quicktime' }],
    ['a scope outside the list', { ...request, scope: '../x' as never }],
  ])('refuses %s without signing anything', async (_, bad) => {
    const res = await prepareVideoUpload(bad);

    expect(res.success).toBe(false);
    expect(presign).not.toHaveBeenCalled();
  });
});

describe('finalizeVideoUpload', () => {
  it('records a stored mp4 whose bytes are an mp4', async () => {
    getFile.mockResolvedValue(object(MP4));

    const res = await finalizeVideoUpload({ fileKey: KEY, fileName: 'demo.mp4' });

    expect(res.success).toBe(true);
    expect(mediaCreate.mock.calls[0][0].data).toMatchObject({
      fileKey: KEY,
      fileName: 'demo.mp4',
      mimeType: 'video/mp4',
      size: MP4.byteLength,
      userId: 'admin-1',
    });
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('deletes an object that is not the video its key says, and records nothing', async () => {
    getFile.mockResolvedValue(object(HTML));

    const res = await finalizeVideoUpload({ fileKey: KEY, fileName: 'evil.mp4' });

    expect(res.success).toBe(false);
    expect(deleteFile).toHaveBeenCalledWith(KEY);
    expect(mediaCreate).not.toHaveBeenCalled();
  });

  it('deletes an object over 10 MB without reading it', async () => {
    getFile.mockResolvedValue(object(MP4, 10 * MiB + 1));

    const res = await finalizeVideoUpload({ fileKey: KEY, fileName: 'big.mp4' });

    expect(res.success).toBe(false);
    expect(res.errorMsg).toContain('10 MB');
    expect(deleteFile).toHaveBeenCalledWith(KEY);
    expect(mediaCreate).not.toHaveBeenCalled();
  });

  it('refuses a key that is not the caller\'s, without touching storage', async () => {
    const res = await finalizeVideoUpload({
      fileKey: KEY.replace('admin-1', 'someone-else'),
      fileName: 'x.mp4',
    });

    expect(res.success).toBe(false);
    expect(getFile).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
