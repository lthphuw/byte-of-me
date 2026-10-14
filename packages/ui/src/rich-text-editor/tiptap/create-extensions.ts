import type { AnyExtension } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

import type { EditorLabels } from './editor-labels';
import { ClipboardImport } from './extensions/clipboard-import';
import { TableHeaderScopes } from './extensions/header-scopes-plugin';
import { ImageExtension, type ImageUploadFn } from './extensions/image';
import { ImageGroup } from './extensions/image-group';
import { ImagePlaceholder } from './extensions/image-placeholder';
import { MermaidSize } from './extensions/mermaid-size';
import { NumericTableColumns } from './extensions/numeric-columns-plugin';
import { Citation } from './extensions/references/citation';
import { ReferenceList } from './extensions/references/reference-list';
import { SearchAndReplace } from './extensions/search-and-replace';
// Shared with the server-side render schema so both stay identical.
import { CustomHeading, lowlight } from './render-extensions';

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
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      // Registered explicitly below; leaving them on duplicates the extension
      // names ('link', 'underline') and Tiptap warns on every editor mount.
      link: false,
      underline: false,
    }),
    CodeBlockLowlight.configure({ lowlight }),
    MermaidSize,
    CustomHeading,
    Placeholder.configure({
      placeholder: options.placeholder ?? options.labels.defaultPlaceholder,
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Subscript,
    Superscript,
    Underline,
    Link,
    Color,
    Highlight.configure({ multicolor: true }),
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
