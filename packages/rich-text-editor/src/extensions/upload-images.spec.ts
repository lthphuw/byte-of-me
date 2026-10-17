import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it, spyOn } from 'bun:test';
import { toast } from 'sonner';

import { insertImagesAt, uploadImages } from './upload-images';

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

describe('insertImagesAt', () => {
  function editorWith(html: string) {
    return new Editor({ extensions: [StarterKit, Image], content: html });
  }
  const imageSrcs = (editor: Editor) =>
    (editor.getJSON().content ?? [])
      .filter((node) => node.type === 'image')
      .map((node) => node.attrs?.src);

  it('inserts each uploaded file as an image, in order, from the position given', async () => {
    const editor = editorWith('<p>ab</p>');

    await insertImagesAt(
      editor.view,
      [file('a.png'), file('b.png')],
      async (f) => `/media/${f.name}`,
      'Upload failed',
      0
    );

    expect(imageSrcs(editor)).toEqual(['/media/a.png', '/media/b.png']);
    editor.destroy();
  });

  it('inserts at the caret when no position is given', async () => {
    const editor = editorWith('<p>ab</p>');
    editor.commands.setTextSelection(2);

    await insertImagesAt(
      editor.view,
      [file('a.png')],
      async () => '/media/a.png',
      'Upload failed'
    );

    expect(imageSrcs(editor)).toEqual(['/media/a.png']);
    editor.destroy();
  });

  it('clamps a drop position that the document has since shrunk below', async () => {
    const editor = editorWith('<p>a long paragraph of text</p>');

    await insertImagesAt(
      editor.view,
      [file('a.png')],
      async () => {
        // The author deletes everything while the upload is in flight.
        editor.commands.clearContent();
        return '/media/a.png';
      },
      'Upload failed',
      28
    );

    expect(imageSrcs(editor)).toEqual(['/media/a.png']);
    editor.destroy();
  });

  it('does nothing, and does not throw, when the editor goes away mid-upload', async () => {
    const editor = editorWith('<p>ab</p>');
    const view = editor.view;
    let release: (src: string) => void = () => {};

    const done = insertImagesAt(
      view,
      [file('a.png')],
      () => new Promise<string>((resolve) => (release = resolve)),
      'Upload failed',
      0
    );
    editor.destroy();
    release('/media/a.png');

    await expect(done).resolves.toBeUndefined();
  });
});
