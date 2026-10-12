import { describe, expect, it, spyOn } from 'bun:test';
import { toast } from 'sonner';

import { uploadImages } from './upload-images';

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('uploadImages', () => {
  it('starts every upload before any finishes, then returns them in file order', async () => {
    let started = 0;
    const releases: Array<() => void> = [];

    const pending = uploadImages(
      [file('a.png'), file('b.png'), file('c.png')],
      (f) =>
        new Promise<string>((resolve) => {
          started += 1;
          releases.push(() => resolve(`/media/${f.name}`));
        }),
      'Upload failed'
    );

    await Promise.resolve();
    expect(started).toBe(3);

    // Finish out of order: the result must still follow the files, or a
    // multi-image paste lands its screenshots shuffled in the document.
    releases[2]?.();
    releases[0]?.();
    releases[1]?.();

    expect(await pending).toEqual([
      { src: '/media/a.png', alt: 'a.png' },
      { src: '/media/b.png', alt: 'b.png' },
      { src: '/media/c.png', alt: 'c.png' },
    ]);
  });

  it('skips a refused file and still returns the rest', async () => {
    const result = await uploadImages(
      [file('a.png'), file('big.png'), file('c.png')],
      async (f) => {
        if (f.name === 'big.png') throw new Error('big.png is too large');
        return `/media/${f.name}`;
      },
      'Upload failed'
    );

    expect(result.map((image) => image.alt)).toEqual(['a.png', 'c.png']);
  });

  it('shows the failure text it was given when a refusal has no message', async () => {
    const toastError = spyOn(toast, 'error').mockImplementation(() => 1);

    try {
      const result = await uploadImages(
        [file('big.png'), file('blank.png')],
        async (f) => {
          if (f.name === 'big.png') throw new Error('big.png is too large');
          throw new Error('');
        },
        'Tải lên thất bại'
      );

      expect(result).toEqual([]);
      expect(toastError).toHaveBeenCalledWith('big.png is too large');
      expect(toastError).toHaveBeenCalledWith('Tải lên thất bại');
    } finally {
      toastError.mockRestore();
    }
  });
});
