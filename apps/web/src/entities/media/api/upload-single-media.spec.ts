/**
 * What an editor relies on when it hands a pasted image to `uploadSingleMedia`:
 * settings are not re-read per image, a dropped batch compresses a bounded few at
 * a time, and a refusal reaches the author with its reason. Dependencies injected.
 */
import { describe, expect, it, mock } from 'bun:test';

import { createSingleMediaUploader } from './upload-single-media';

import { MAX_UPLOAD_BATCH } from '@/entities/media/model/upload-constraints';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';
import type { Media } from '@/shared/types/models';

const config: ImageCompressionConfig = {
  enabled: true,
  maxWidth: 2048,
  quality: 82,
  format: 'webp',
};

const png = (name: string, bytes = 8) =>
  new File([new Uint8Array(bytes)], name, { type: 'image/png' });

const stored = (files: File[]) => ({
  success: true as const,
  data: files.map((file) => ({ url: `https://cdn.example/${file.name}` }) as Media),
});

/** A clock the test advances by hand. */
function clock(start = 1_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

function setup(
  overrides: Partial<Parameters<typeof createSingleMediaUploader>[0]> = {}
) {
  const time = clock();
  const fetchCompressionConfig = mock(async () => config);
  const compress = mock(async (file: File) => file);
  const upload = mock(async (files: File[]) => stored(files));
  const uploadSingleMedia = createSingleMediaUploader({
    fetchCompressionConfig,
    compress,
    upload,
    now: time.now,
    ...overrides,
  });
  return { uploadSingleMedia, fetchCompressionConfig, compress, upload, time };
}

describe('uploadSingleMedia compression settings', () => {
  it('reads the settings once for a run of images, not once per image', async () => {
    const { uploadSingleMedia, fetchCompressionConfig } = setup();

    for (const name of ['a.png', 'b.png', 'c.png', 'd.png']) {
      await uploadSingleMedia(png(name), 'blog');
    }

    expect(fetchCompressionConfig).toHaveBeenCalledTimes(1);
  });

  it('shares one read between images that start together', async () => {
    const { uploadSingleMedia, fetchCompressionConfig } = setup();

    await Promise.all(
      ['a.png', 'b.png', 'c.png'].map((name) => uploadSingleMedia(png(name)))
    );

    expect(fetchCompressionConfig).toHaveBeenCalledTimes(1);
  });

  it('reads them again once the cached copy has expired', async () => {
    const { uploadSingleMedia, fetchCompressionConfig, time } = setup();

    await uploadSingleMedia(png('a.png'));
    time.advance(60_000);
    await uploadSingleMedia(png('b.png'));

    expect(fetchCompressionConfig).toHaveBeenCalledTimes(2);
  });

  it('passes the fetched settings to the compressor', async () => {
    const { uploadSingleMedia, compress } = setup();
    const file = png('a.png');

    await uploadSingleMedia(file);

    expect(compress).toHaveBeenCalledWith(file, config);
  });

  it('does not keep a failed read: the next image asks again', async () => {
    const fetchCompressionConfig = mock(async () => config);
    fetchCompressionConfig.mockRejectedValueOnce(new Error('session expired'));
    const { uploadSingleMedia } = setup({ fetchCompressionConfig });

    await expect(uploadSingleMedia(png('a.png'))).rejects.toThrow(
      'session expired'
    );
    await expect(uploadSingleMedia(png('b.png'))).resolves.toBe(
      'https://cdn.example/b.png'
    );

    expect(fetchCompressionConfig).toHaveBeenCalledTimes(2);
  });
});

describe('uploadSingleMedia compression bound', () => {
  /** A compressor that holds every file until the test lets it go. */
  function heldCompressor() {
    const held: (() => void)[] = [];
    let active = 0;
    let peak = 0;
    const compress = async (file: File) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => {
        held.push(resolve);
      });
      active -= 1;
      return file;
    };
    return {
      compress,
      peak: () => peak,
      started: () => held.length,
      release: () => held.shift()?.(),
    };
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it(`compresses at most ${MAX_UPLOAD_BATCH} images at once and still uploads them all, each to its own URL`, async () => {
    const held = heldCompressor();
    const { uploadSingleMedia } = setup({ compress: held.compress });
    const names = Array.from({ length: 12 }, (_, i) => `img-${i}.png`);

    const uploads = names.map((name) => uploadSingleMedia(png(name)));
    await settle();

    expect(held.started()).toBe(MAX_UPLOAD_BATCH);

    for (let i = 0; i < names.length; i++) {
      held.release();
      await settle();
    }

    expect(await Promise.all(uploads)).toEqual(
      names.map((name) => `https://cdn.example/${name}`)
    );
    expect(held.peak()).toBe(MAX_UPLOAD_BATCH);
  });

  it('frees its slot when a compression fails, so later images are not stuck', async () => {
    const compress = mock(async (file: File) => {
      if (file.name.startsWith('bad')) throw new Error('decode failed');
      return file;
    });
    const { uploadSingleMedia } = setup({ compress });

    const failed = await Promise.allSettled(
      Array.from({ length: MAX_UPLOAD_BATCH + 2 }, (_, i) =>
        uploadSingleMedia(png(`bad-${i}.png`))
      )
    );
    const later = await uploadSingleMedia(png('good.png'));

    expect(failed.every((r) => r.status === 'rejected')).toBe(true);
    expect(later).toBe('https://cdn.example/good.png');
  });
});

describe('uploadSingleMedia refusals', () => {
  it('refuses a file still over the limit after compression, without uploading it', async () => {
    const { uploadSingleMedia, upload } = setup();

    await expect(
      uploadSingleMedia(png('huge.png', 4 * 1024 * 1024))
    ).rejects.toThrow(/huge\.png/);

    expect(upload).not.toHaveBeenCalled();
  });

  it('carries the server\'s reason up when the upload is refused', async () => {
    const { uploadSingleMedia } = setup({
      upload: mock(async () => ({
        success: false as const,
        errorMsg: 'Storage is full',
      })),
    });

    await expect(uploadSingleMedia(png('a.png'))).rejects.toThrow(
      'Storage is full'
    );
  });

  it('uploads under the scope it was given', async () => {
    const { uploadSingleMedia, upload } = setup();
    const file = png('a.png');

    await uploadSingleMedia(file, 'education');

    expect(upload).toHaveBeenCalledWith([file], 'education');
  });
});
