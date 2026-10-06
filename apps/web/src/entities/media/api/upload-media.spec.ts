/**
 * `scope` and `file.type` come from the caller and must not be trusted: a bad
 * scope or non-image bytes are refused before storage, and what is stored
 * follows the bytes. Storage and Prisma are replaced so nothing real is written.
 */
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { uploadMedia } from './upload-media';

import type { MediaScope } from '@/entities/media/model/upload-constraints';
import { supabaseStorage } from '@/shared/api/s3-storage-api';

const mediaCreate = mock();
Object.defineProperty(prisma, 'media', {
  value: { create: mediaCreate },
  writable: true,
  configurable: true,
});
// Compression off, so the bytes reach storage exactly as sniffed.
Object.defineProperty(prisma, 'workspaceSettings', {
  value: {
    findUnique: async () => ({
      preferences: {
        imageCompression: {
          enabled: false,
          maxWidth: 2048,
          quality: 82,
          format: 'webp',
        },
      },
    }),
  },
  writable: true,
  configurable: true,
});

const uploadFile = spyOn(supabaseStorage, 'uploadFile');
const getPublicUrl = spyOn(supabaseStorage, 'getPublicUrl');

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
]);
const HTML = new TextEncoder().encode('<html><script>alert(1)</script></html>');

const fileOf = (bytes: Uint8Array, name: string, type: string) =>
  new File([bytes as BlobPart], name, { type });

describe('uploadMedia', () => {
  beforeEach(() => {
    uploadFile.mockReset().mockResolvedValue({ fileKey: 'stored' });
    getPublicUrl.mockReset().mockReturnValue('https://cdn.example/x');
    mediaCreate.mockReset().mockImplementation(async ({ data }) => ({
      id: 'media-1',
      ...data,
    }));
  });

  it('refuses a scope outside the list before touching storage', async () => {
    const res = await uploadMedia(
      [fileOf(PNG, 'a.png', 'image/png')],
      '../../other-user' as MediaScope
    );

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(mediaCreate).not.toHaveBeenCalled();
  });

  it('refuses a file whose bytes are not an image, whatever it declares', async () => {
    const res = await uploadMedia(
      [fileOf(HTML, 'evil.png', 'image/png')],
      'blog'
    );

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(mediaCreate).not.toHaveBeenCalled();
  });

  it('stores what the bytes are, not what the caller declared', async () => {
    // PNG bytes behind a JPEG claim: key extension and content type follow the bytes.
    const res = await uploadMedia(
      [fileOf(PNG, 'photo.jpg', 'image/jpeg')],
      'blog'
    );

    expect(res.success).toBe(true);
    expect(uploadFile).toHaveBeenCalledTimes(1);
    const [{ fileKey, contentType }] = uploadFile.mock.calls[0] as [
      { fileKey: string; contentType: string }
    ];
    expect(contentType).toBe('image/png');
    expect(fileKey).toMatch(/\/media\/blog\/\d{4}\/\d{2}\/[^/]+\.png$/);
    expect(mediaCreate.mock.calls[0]?.[0].data.mimeType).toBe('image/png');
  });

  it('records a sanitised file name, not the raw one', async () => {
    await uploadMedia(
      [fileOf(PNG, '../../x/\u0000evil.png', 'image/png')],
      'blog'
    );

    const { fileName } = mediaCreate.mock.calls[0]?.[0].data as {
      fileName: string;
    };
    expect(fileName).not.toMatch(/[\\/]/);
    expect(fileName).not.toContain('\u0000');
    expect(fileName.endsWith('evil.png')).toBe(true);
  });
});
