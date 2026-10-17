/**
 * `scope` and `file.type` come from the caller and must not be trusted: a bad
 * scope, bytes that are not an image, and any video are refused before storage.
 * Clips take the direct path (`uploadVideoDirect`). Storage and Prisma are
 * replaced so nothing real is written.
 */
import type { MediaScope } from '@byte-of-me/contracts/media';
import { prisma } from '@byte-of-me/db';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { uploadMedia } from './upload-media';

import { supabaseStorage } from '@/shared/api/s3-storage-api';

const mediaCreate = mock();
Object.defineProperty(prisma, 'media', {
  value: { create: mediaCreate },
  writable: true,
  configurable: true,
});
// Compression off unless a test turns it on, so image bytes reach storage as sniffed.
let compressionEnabled = false;
Object.defineProperty(prisma, 'workspaceSettings', {
  value: {
    findUnique: async () => ({
      preferences: {
        imageCompression: {
          enabled: compressionEnabled,
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

const MiB = 1024 * 1024;
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const MP4 = new Uint8Array([
  ...[
    0,
    0,
    0,
    24,
    ...ascii('ftypisom'),
    0,
    0,
    2,
    0,
    ...ascii('isom'),
    ...ascii('mp42'),
  ],
  ...[0, 0, 0, 8, ...ascii('free')],
]);
const WEBM = new Uint8Array([
  ...[0x1a, 0x45, 0xdf, 0xa3, 0x8b],
  ...[0x42, 0x86, 0x81, 0x01],
  ...[0x42, 0x82, 0x84, ...ascii('webm')],
  ...[0x18, 0x53, 0x80, 0x67],
]);
const GIF = new Uint8Array([...ascii('GIF89a'), 1, 0, 1, 0, 0, 0, 0]);
const SVG = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
);
/** `head` followed by zeros up to `size` bytes. */
const padded = (head: Uint8Array, size: number) => {
  const out = new Uint8Array(size);
  out.set(head);
  return out;
};

const fileOf = (bytes: Uint8Array, name: string, type: string) =>
  new File([bytes as BlobPart], name, { type });

describe('uploadMedia', () => {
  beforeEach(() => {
    compressionEnabled = false;
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

  it('refuses an mp4 under any scope, even with compression on, before storage', async () => {
    compressionEnabled = true;

    const res = await uploadMedia(
      [fileOf(MP4, 'int8.mp4', 'video/mp4')],
      'featured-work'
    );

    expect(res.success).toBe(false);
    expect(res.errorMsg).toContain('int8.mp4');
    expect(res.errorMsg).toContain('video');
    expect(uploadFile).not.toHaveBeenCalled();
    expect(mediaCreate).not.toHaveBeenCalled();
  });

  it('refuses a webm, which is a clip too', async () => {
    const res = await uploadMedia(
      [fileOf(WEBM, 'fp16.webm', 'video/webm')],
      'featured-work'
    );

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(mediaCreate).not.toHaveBeenCalled();
  });

  it('keeps accepting a GIF as an image, stored untouched', async () => {
    const res = await uploadMedia(
      [fileOf(GIF, 'demo.gif', 'image/gif')],
      'featured-work'
    );

    expect(res.success).toBe(true);
    const [{ contentType, fileKey }] = uploadFile.mock.calls[0] as [
      { contentType: string; fileKey: string }
    ];
    expect(contentType).toBe('image/gif');
    expect(fileKey).toMatch(/\.gif$/);
  });

  it.each([
    ['a PNG', PNG],
    ['an HTML page', HTML],
    ['an SVG', SVG],
    ['a truncated mp4 header', MP4.subarray(0, 14)],
    ['an empty file', new Uint8Array()],
  ])(
    'refuses %s renamed .mp4 and declared video/mp4',
    async (_label, bytes) => {
      const res = await uploadMedia(
        [fileOf(bytes, 'clip.mp4', 'video/mp4')],
        'featured-work'
      );

      expect(res.success).toBe(false);
      expect(uploadFile).not.toHaveBeenCalled();
      expect(mediaCreate).not.toHaveBeenCalled();
    }
  );

  it('refuses a clip whose declared type disagrees with its bytes, either way', async () => {
    const cases: [Uint8Array, string][] = [
      [MP4, 'video/webm'],
      [WEBM, 'video/mp4'],
      [MP4, 'image/png'],
      [WEBM, 'image/gif'],
      [PNG, 'video/webm'],
    ];
    for (const [bytes, type] of cases) {
      const res = await uploadMedia(
        [fileOf(bytes, 'x', type)],
        'featured-work'
      );
      expect(res.success).toBe(false);
    }
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('refuses an image over 3 MB, before storage', async () => {
    const bigImage = await uploadMedia(
      [fileOf(padded(PNG, 3 * MiB + 1), 'big.png', 'image/png')],
      'featured-work'
    );

    expect(bigImage).toEqual({
      success: false,
      errorMsg: '"big.png" is larger than 3 MB.',
    });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('refuses a clip at exactly 15 MB, the most the direct path takes', async () => {
    const res = await uploadMedia(
      [fileOf(padded(MP4, 15 * MiB), 'max.mp4', 'video/mp4')],
      'featured-work'
    );

    expect(res.success).toBe(false);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  describe('when storage or the database refuses', () => {
    const image = () => fileOf(padded(PNG, 2.5 * MiB), 'demo.png', 'image/png');

    it('names the file and the bucket limit when storage answers EntityTooLarge', async () => {
      uploadFile.mockRejectedValue(
        Object.assign(
          new Error('The object exceeded the maximum allowed size'),
          {
            name: 'EntityTooLarge',
            $metadata: { httpStatusCode: 413 },
          }
        )
      );

      const res = await uploadMedia([image()], 'blog');

      expect(res.success).toBe(false);
      expect(res.errorMsg).toContain('demo.png');
      expect(res.errorMsg).toContain('2.5 MB');
      expect(res.errorMsg).toContain('storage bucket');
    });

    it('carries the cause for any other failure instead of a bare "failed"', async () => {
      uploadFile.mockRejectedValue(
        Object.assign(new Error('Access denied'), {
          name: 'AccessDenied',
          $metadata: { httpStatusCode: 403 },
        })
      );

      const res = await uploadMedia([image()], 'blog');

      expect(res.success).toBe(false);
      expect(res.errorMsg).toContain('AccessDenied');
      expect(res.errorMsg).toContain('403');
    });
  });

  it('keeps the batch rule', async () => {
    const six = Array.from({ length: 6 }, () =>
      fileOf(PNG, 'a.png', 'image/png')
    );
    const tooMany = await uploadMedia(six, 'blog');

    expect(tooMany).toEqual({
      success: false,
      errorMsg: 'Too many files at once. Upload at most 5.',
    });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  describe('polyglot payloads', () => {
    // A valid `ftyp` box, then markup: the sniff passes, so what is stored and
    // served must still be the video type, never something a browser would render.
    const POLYGLOT = new Uint8Array([
      ...MP4,
      ...new TextEncoder().encode(
        '<html><script>alert(document.cookie)</script></html>'
      ),
    ]);

    it('refuses an mp4 header followed by HTML, declared as a video, before storage', async () => {
      const res = await uploadMedia(
        [fileOf(POLYGLOT, 'poc.mp4', 'video/mp4')],
        'featured-work'
      );

      expect(res.success).toBe(false);
      expect(uploadFile).not.toHaveBeenCalled();
      expect(mediaCreate).not.toHaveBeenCalled();
    });

    it.each(['image/png', 'image/jpeg', 'image/svg+xml', 'text/html', ''])(
      'does not accept that polyglot as an image declared %p',
      async (type) => {
        const res = await uploadMedia(
          [fileOf(POLYGLOT, 'poc.png', type)],
          'featured-work'
        );

        expect(res.success).toBe(false);
        expect(uploadFile).not.toHaveBeenCalled();
        expect(mediaCreate).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['an HTML page', HTML],
      [
        'HTML dressed as an ftyp box',
        new TextEncoder().encode('<!--ftypisom--><script>x</script>'),
      ],
    ])('rejects %s declared video/mp4', async (_label, bytes) => {
      const res = await uploadMedia(
        [fileOf(bytes, 'poc.mp4', 'video/mp4')],
        'featured-work'
      );

      expect(res.success).toBe(false);
      expect(uploadFile).not.toHaveBeenCalled();
      expect(mediaCreate).not.toHaveBeenCalled();
    });
  });
});
