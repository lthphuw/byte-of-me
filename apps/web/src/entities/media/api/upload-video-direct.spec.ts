/**
 * A clip goes browser → storage with a signed URL, because Vercel refuses a
 * function request body over 4.5 MB. Every step is injected; nothing real is called.
 */
import { describe, expect, it, mock } from 'bun:test';

import { uploadVideoDirect } from './upload-video-direct';

import type { Media } from '@/shared/types/models';

const file = new File([new Uint8Array(8)], 'demo.mp4', { type: 'video/mp4' });
const row = { id: 'm1', url: 'https://cdn.example/demo.mp4' } as Media;

function setup(overrides: Partial<Parameters<typeof uploadVideoDirect>[2]> = {}) {
  const prepare = mock(async () => ({
    success: true as const,
    data: { uploadUrl: 'https://s3.example/put?sig=1', fileKey: 'users/u/media/featured-work/2026/10/abc.mp4' },
  }));
  const put = mock(async () => new Response(null, { status: 200 }));
  const finalize = mock(async () => ({ success: true as const, data: row }));
  const deps = { prepare, put, finalize, ...overrides };

  return { deps: deps as NonNullable<Parameters<typeof uploadVideoDirect>[2]>, prepare, put, finalize };
}

describe('uploadVideoDirect', () => {
  it('asks for a URL, PUTs the file to it, then records it', async () => {
    const { deps, prepare, put, finalize } = setup();

    expect(await uploadVideoDirect(file, 'featured-work', deps)).toBe(row);

    expect(prepare).toHaveBeenCalledWith({
      fileName: 'demo.mp4',
      mimeType: 'video/mp4',
      size: 8,
      scope: 'featured-work',
    });
    expect(put).toHaveBeenCalledWith('https://s3.example/put?sig=1', {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'video/mp4' },
    });
    expect(finalize).toHaveBeenCalledWith({
      fileKey: 'users/u/media/featured-work/2026/10/abc.mp4',
      fileName: 'demo.mp4',
    });
  });

  it('stops at a refused URL request, without touching storage', async () => {
    const { deps, put } = setup({
      prepare: mock(async () => ({ success: false as const, errorMsg: 'Could not start the upload.' })),
    });

    await expect(uploadVideoDirect(file, 'featured-work', deps)).rejects.toThrow(
      'Could not start the upload.'
    );
    expect(put).not.toHaveBeenCalled();
  });

  it('names the status when storage refuses the PUT, and does not record it', async () => {
    const { deps, finalize } = setup({
      put: mock(async () => new Response('EntityTooLarge', { status: 413 })),
    });

    await expect(uploadVideoDirect(file, 'featured-work', deps)).rejects.toThrow(
      'Storage refused "demo.mp4" (HTTP 413): EntityTooLarge'
    );
    expect(finalize).not.toHaveBeenCalled();
  });

  it('carries the reason when the stored bytes are refused', async () => {
    const { deps } = setup({
      finalize: mock(async () => ({ success: false as const, errorMsg: '"demo.mp4" is not an accepted image or video format.' })),
    });

    await expect(uploadVideoDirect(file, 'featured-work', deps)).rejects.toThrow(
      'not an accepted image or video format'
    );
  });
});
