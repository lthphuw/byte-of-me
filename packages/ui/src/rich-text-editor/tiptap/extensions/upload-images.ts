import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import { toast } from 'sonner';

import type { ImageUploadFn } from './image-base';

/** An uploaded file, as the `image` node's attributes. */
type UploadedImage = { src: string; alt: string };

/** The options the consumer configures on the image extension. */
type ImageExtensionOptions = {
  uploadFn?: ImageUploadFn;
  uploadFailedText?: string;
};

/**
 * The image extension's options, read off the live editor: every insert path sits in a
 * node view or toolbar that the component owning the option does not render.
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
 * Uploads a batch, returning only the files that made it. A failed file toasts its own
 * message (`uploadSingleMedia` names the file and limit) or `uploadFailedText`, and is
 * skipped rather than aborting the rest.
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
 * The attributes to insert for picked files. With no uploader the local `blob:` URL is
 * inserted and the image node's auto-upload effect converts it, as in `useImageUpload`.
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

/**
 * Uploads dropped or pasted files and inserts each as an `image` node, from `at` or the
 * selection. `at` dates from the drop (typing may have moved it), so it is clamped.
 */
export async function insertImagesAt(
  view: EditorView,
  files: File[],
  upload: ImageUploadFn,
  uploadFailedText: string,
  at?: number
): Promise<void> {
  const uploaded = await uploadImages(files, upload, uploadFailedText);
  let insertAt = at;

  for (const image of uploaded) {
    if (view.isDestroyed) return;
    const imageType = view.state.schema.nodes.image;
    if (!imageType) return;

    const pos = Math.min(
      insertAt ?? view.state.selection.from,
      view.state.doc.content.size
    );
    const node = imageType.create(image);
    view.dispatch(view.state.tr.insert(pos, node));
    insertAt = pos + node.nodeSize;
  }
}
