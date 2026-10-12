import type { Editor } from '@tiptap/core';
import { toast } from 'sonner';

import type { ImageUploadFn } from './image-base';

/** An uploaded file, as the `image` node's attributes. */
export type UploadedImage = { src: string; alt: string };

/** The options the consumer configures on the image extension. */
type ImageExtensionOptions = {
  uploadFn?: ImageUploadFn;
  uploadFailedText?: string;
};

/**
 * The image extension's options, read off the live editor.
 *
 * Read there rather than threaded through props: every insert path (the
 * placeholder node, the row's add button, the phone toolbar) sits in a node
 * view or a toolbar, and none of them is rendered by the component that owns
 * the option.
 */
function imageExtensionOptions(
  editor: Editor
): ImageExtensionOptions | undefined {
  const extension = editor.extensionManager.extensions.find(
    (ext) => ext.name === 'image'
  );

  return extension?.options as ImageExtensionOptions | undefined;
}

/** The uploader the consumer configured on the image extension. */
export function imageUploadFn(editor: Editor): ImageUploadFn | undefined {
  return imageExtensionOptions(editor)?.uploadFn;
}

/**
 * The failure text the consumer configured on the image extension. Empty when
 * the editor has no image extension, which also means it has no uploader, so
 * nothing can fail.
 */
export function imageUploadFailedText(editor: Editor): string {
  return imageExtensionOptions(editor)?.uploadFailedText ?? '';
}

/**
 * Uploads a batch and returns only the files that made it.
 *
 * A failed file is reported and skipped rather than aborting the batch —
 * dropping four screenshots and losing all of them because the second was too
 * large is worse than getting three. The report is the part that used to be
 * missing: `uploadSingleMedia` throws with a message naming the file and the
 * limit, and the drop/paste path swallowed it, so an author whose upload was
 * refused saw nothing at all and an image just failed to appear. A refusal with
 * no message of its own shows `uploadFailedText`, already translated by the
 * caller.
 */
export async function uploadImages(
  files: File[],
  upload: ImageUploadFn,
  uploadFailedText: string
): Promise<UploadedImage[]> {
  // All at once, not one after another: a pasted batch is capped upstream
  // (`MAX_UPLOAD_BATCH`) and the uploader bounds its own compression. Results
  // follow file order, whichever upload finishes first.
  const results = await Promise.all(
    files.map(async (file): Promise<UploadedImage | null> => {
      try {
        return { src: await upload(file), alt: file.name };
      } catch (err) {
        toast.error(
          err instanceof Error && err.message ? err.message : uploadFailedText
        );
        return null;
      }
    })
  );

  return results.filter((image): image is UploadedImage => image !== null);
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
  files: File[],
  uploadFailedText: string
): Promise<UploadedImage[]> {
  const upload = imageUploadFn(editor);

  if (!upload) {
    return files.map((file) => ({
      src: URL.createObjectURL(file),
      alt: file.name,
    }));
  }

  return uploadImages(files, upload, uploadFailedText);
}

/** The image files a drop, a paste or a file input carries. */
export function imageFilesFrom(files: FileList | null | undefined): File[] {
  if (!files) return [];
  return Array.from(files).filter((file) => file.type.startsWith('image/'));
}
