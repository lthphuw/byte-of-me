/**
 * What the library's upload dialog tells the author: clips are accepted only where
 * the dialog opts in, each kind of file is held to its own size, and a request the
 * server would refuse as a whole (too many files, too many bytes) is answered here,
 * in the active locale, before anything is sent. Renders the real component.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

// The catalogue lives outside `src/`, so only a relative path reaches it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../../messages/en.json';

import { ImageUpload } from './image-upload';

import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

const MiB = 1024 * 1024;
const compressionOff: ImageCompressionConfig = {
  enabled: false,
  maxWidth: 2048,
  quality: 82,
  format: 'webp',
};

const toastError = spyOn(toast, 'error').mockImplementation(() => 1);
const uploadFiles = mock(async (_files: File[]) => {});

function renderUpload(acceptVideo: boolean) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ dashboard: { media: en.dashboard.media } }}>
      <ImageUpload
        uploadFiles={uploadFiles}
        compressionConfig={compressionOff}
        acceptVideo={acceptVideo}
      />
    </NextIntlClientProvider>
  );
}

const fileOf = (name: string, type: string, size = 8) =>
  new File([new Uint8Array(size)], name, { type });

function choose(container: HTMLElement, ...files: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('no file input');
  fireEvent.change(input, { target: { files } });
}

beforeEach(() => {
  toastError.mockClear();
  uploadFiles.mockClear();
});

afterEach(cleanup);

describe('ImageUpload with video', () => {
  it('takes an mp4 and a webm when the dialog opts in, and lists them', async () => {
    const { container } = renderUpload(true);

    expect(container.querySelector('input')?.getAttribute('accept')).toBe(
      'image/*,video/mp4,video/webm'
    );
    choose(container, fileOf('int8.mp4', 'video/mp4'), fileOf('fp16.webm', 'video/webm'));

    expect(await screen.findByText('int8.mp4')).toBeTruthy();
    expect(screen.getByText('fp16.webm')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('refuses a clip by default, as an image-only dialog always did', async () => {
    const { container } = renderUpload(false);

    expect(container.querySelector('input')?.getAttribute('accept')).toBe('image/*');
    choose(container, fileOf('int8.mp4', 'video/mp4'));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0]?.[1]).toEqual({ description: 'int8.mp4 is not an image.' });
    expect(screen.queryByText('int8.mp4')).toBeNull();
  });

  it('holds a clip to 10 MB and an image to 3 MB, naming the limit', async () => {
    const { container } = renderUpload(true);

    choose(
      container,
      fileOf('big.mp4', 'video/mp4', 10 * MiB + 1),
      fileOf('big.png', 'image/png', 3 * MiB + 1),
      fileOf('ok.mp4', 'video/mp4', 10 * MiB)
    );

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(2));
    expect(toastError.mock.calls.map((call) => (call[1] as { description: string }).description)).toEqual([
      'big.mp4 exceeds 10MB.',
      'big.png exceeds 3MB.',
    ]);
    expect(screen.getByText('ok.mp4')).toBeTruthy();
  });

  it('answers a request that is too big as a whole before sending it', async () => {
    const { container } = renderUpload(true);
    choose(
      container,
      fileOf('a.mp4', 'video/mp4', 10 * MiB),
      fileOf('b.webm', 'video/webm', 10 * MiB)
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Upload 2 Files' }));

    expect(toastError.mock.calls[0]?.[0]).toBe('Files too large');
    expect(toastError.mock.calls[0]?.[1]).toEqual({
      description: 'Together they exceed 16MB. Upload fewer at once.',
    });
    expect(uploadFiles).not.toHaveBeenCalled();
  });

  it('answers more than five files before sending them', async () => {
    const { container } = renderUpload(false);
    choose(container, ...Array.from({ length: 6 }, (_, i) => fileOf(`${i}.png`, 'image/png')));
    fireEvent.click(await screen.findByRole('button', { name: 'Upload 6 Files' }));

    expect(toastError.mock.calls[0]?.[0]).toBe('Too many files');
    expect(toastError.mock.calls[0]?.[1]).toEqual({
      description: 'Upload at most 5 files at once.',
    });
    expect(uploadFiles).not.toHaveBeenCalled();
  });
});
