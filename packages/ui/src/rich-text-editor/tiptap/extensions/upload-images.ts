import type { Editor } from '@tiptap/core';
import { toast } from 'sonner';

import type { ImageUploadFn } from './image-base';

/** An uploaded file, as the `image` node's attributes. */
export type UploadedImage = { src: string; alt: string };

/**
 * The uploader the consumer configured on the image extension.
 *
 * Read off the live editor rather than threaded through props: every insert
 * path (the placeholder node, the row's add button, the phone toolbar) sits in
 * a node view or a toolbar, and none of them is rendered by the component that
 * owns the option.
 */
export function imageUploadFn(editor: Editor): ImageUploadFn | undefined {
  const extension = editor.extensionManager.extensions.find(
    (ext) => ext.name === 'image'
  );

  return (extension?.options as { uploadFn?: ImageUploadFn } | undefined)
    ?.uploadFn;
}

/**
 * Uploads a batch and returns only the files that made it.
 *
 * A failed file is reported and skipped rather than aborting the batch —
 * dropping four screenshots and losing all of them because the second was too
 * large is worse than getting three. The report is the part that used to be
 * missing: `uploadSingleMedia` throws with a message naming the file and the
 * limit, and the drop/paste path swallowed it, so an author whose upload was
 * refused saw nothing at all and an image just failed to appear.
 */
export async function uploadImages(
  files: File[],
  upload: ImageUploadFn
): Promise<UploadedImage[]> {
  const uploaded: UploadedImage[] = [];

  for (const file of files) {
    try {
      uploaded.push({ src: await upload(file), alt: file.name });
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : `Could not upload ${file.name}`
      );
    }
  }

  return uploaded;
}

/**
 * The attributes to insert for a batch of picked files.
 *
 * With no uploader configured the local `blob:` URL is inserted and the image
 * node's own auto-upload effect converts it — the fallback `useImageUpload`
 * has always taken, kept so every insert path behaves the same way.
 */
export async function resolveImages(
  editor: Editor,
  files: File[]
): Promise<UploadedImage[]> {
  const upload = imageUploadFn(editor);

  if (!upload) {
    return files.map((file) => ({
      src: URL.createObjectURL(file),
      alt: file.name,
    }));
  }

  return uploadImages(files, upload);
}

/** The image files a drop, a paste or a file input carries. */
export function imageFilesFrom(files: FileList | null | undefined): File[] {
  if (!files) return [];
  return Array.from(files).filter((file) => file.type.startsWith('image/'));
}
