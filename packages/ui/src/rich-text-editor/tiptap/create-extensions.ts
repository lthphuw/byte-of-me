import type { AnyExtension } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import Typography from '@tiptap/extension-typography';
import { Markdown } from '@tiptap/markdown';

import type { EditorLabels } from './editor-labels';
import { ClipboardImport } from './extensions/clipboard-import';
import { TableHeaderScopes } from './extensions/header-scopes-plugin';
import { ImageExtension, type ImageUploadFn } from './extensions/image';
import { ImageGroup } from './extensions/image-group';
import { ImagePlaceholder } from './extensions/image-placeholder';
import { NumericTableColumns } from './extensions/numeric-columns-plugin';
import { Citation } from './extensions/references/citation';
import { ReferenceList } from './extensions/references/reference-list';
import { SearchAndReplace } from './extensions/search-and-replace';
// Shared with the server-side render schema so both stay identical.
import { sharedExtensions } from './render-extensions';

/** The editor's schema and behaviour. `render-extensions.ts` mirrors it for the public page. */
export function createExtensions(options: {
  uploadImage?: ImageUploadFn;
  /** Shown when an upload is refused. Required, so no editor can drop it. */
  uploadFailedText: string;
  /** The app's text for every control the extensions draw. Required, like `uploadFailedText`. */
  labels: EditorLabels;
  placeholder?: string;
}): AnyExtension[] {
  return [
    ...sharedExtensions,
    Placeholder.configure({
      placeholder: options.placeholder ?? options.labels.defaultPlaceholder,
    }),
    ImageExtension.configure({
      uploadFn: options.uploadImage,
      uploadFailedText: options.uploadFailedText,
      labels: options.labels,
    }),
    // Two or more images side by side with one caption: a document node, so
    // every editor built from this list gets it, compact or full.
    ImageGroup.configure({ labels: options.labels }),
    ImagePlaceholder.configure({ labels: options.labels }),
    SearchAndReplace,
    Typography,
    TableKit.configure({ table: { resizable: false } }),
    // Right-aligns figure-only columns and scopes header cells by the same
    // rules the render pass applies, so a table reads the same while it is
    // written as it does once published.
    NumericTableColumns,
    TableHeaderScopes,
    // Pasting a README-style document becomes real blocks, not flat text.
    Markdown,
    Citation.configure({ labels: options.labels }),
    ReferenceList.configure({ labels: options.labels }),
    ClipboardImport.configure({
      uploadImage: options.uploadImage,
      uploadFailedText: options.uploadFailedText,
    }),
  ];
}
