// Server-safe Tiptap schema for rendering stored documents to HTML.
//
// NO 'use client' here, and none in anything this file imports — that is the
// whole point. `RichText` runs `generateHTML` in server components; if it took
// its schema from `rich-text-editor.tsx` (a client module), the import would
// register the entire editor as a client reference and ship it to every page
// that renders rich text. This file mirrors the editor's schema minus the
// editor-only parts generateHTML never touches: node views, upload plumbing,
// placeholder text, search & replace.
//
// Invariant: every node/mark type the editor can persist must be represented
// here with the same name and attributes, or `generateHTML` throws and the
// content falls back to escaped plain text.
import { mergeAttributes, Node } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Color } from '@tiptap/extension-color';
import Heading from '@tiptap/extension-heading';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';

import { CitationBase } from './extensions/references/citation-base';
import { ReferenceListBase } from './extensions/references/reference-list-base';

// `common` registers ~37 languages. This module renders on the server only,
// so the grammars never reach the client bundle — highlight classes are baked
// into the HTML. Unknown languages (e.g. mermaid) fall through as plain text
// with their `language-*` class intact, which the mermaid enhancer keys on.
const lowlight = createLowlight(common);

/** Heading with a persistent `id`, the anchor targets for tables of contents. */
export const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        renderHTML: (attributes) => ({
          id: attributes.id,
        }),
        parseHTML: (element) => element.getAttribute('id'),
      },
    };
  },
});

// Same node name and attribute set as the editor's `ImageExtension`, without
// its React node view. Base renderHTML emits the <img> from these attrs.
const RenderImage = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
      height: { default: null },
      align: { default: 'center' },
      caption: { default: '' },
      aspectRatio: { default: null },
    };
  },
});

// Schema stub for the editor's upload-in-progress node. It should never be
// persisted, but if one slips into a stored document the render must not
// throw away the rest of the content over it.
const RenderImagePlaceholder = Node.create({
  name: 'image-placeholder',
  group: 'block',
  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]` }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)];
  },
});

/**
 * The two math nodes the notes editor persists (`@tiptap/extension-mathematics`
 * via `extensions/math.ts`), as render-side schema.
 *
 * They were missing, and the failure mode was not "equations do not show" —
 * `generateHTML` throws on an unknown node type, `renderRichTextHtml` catches
 * that and falls back to escaping the input, and the input there is an
 * OBJECT, so `escapeHtml` returned `''`. A note containing a single `$x$`
 * therefore rendered as a **completely blank document** on every server
 * surface. Measured directly against `renderRichTextHtml` before this
 * existed: `length 0`.
 *
 * The LaTeX is emitted as a `data-latex` attribute rather than as rendered
 * KaTeX. KaTeX's markup is a deep span tree positioned entirely with inline
 * `style`, and `sanitize.ts` drops `style` on purpose — serving KaTeX from
 * here would mean loosening that for every rendered document. The client
 * turns these placeholders into real formulas instead; see
 * `MathRenderer`. Anything that renders this HTML without that pass shows the
 * LaTeX source, which is legible and honest rather than blank.
 */
const RenderInlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { latex: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const latex = String(node.attrs.latex ?? '');
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'inline-math',
        'data-latex': latex,
        class: 'math-inline',
      }),
      latex,
    ];
  },
});

const RenderBlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  addAttributes() {
    return { latex: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="block-math"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const latex = String(node.attrs.latex ?? '');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'block-math',
        'data-latex': latex,
        class: 'math-block',
      }),
      latex,
    ];
  },
});

export const renderExtensions = [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
  // Registered explicitly below; leaving them on duplicates the extension
  // names ('link', 'underline') and Tiptap warns on every editor mount.
  link: false,
  underline: false,
  }),
  CodeBlockLowlight.configure({ lowlight }),
  CustomHeading,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Subscript,
  Superscript,
  Underline,
  Link,
  Color,
  Highlight.configure({ multicolor: true }),
  RenderImage,
  RenderImagePlaceholder,
  Typography,
  // resizable off: column widths are an editing affordance; rendered tables
  // just fill the column.
  TableKit.configure({ table: { resizable: false } }),
  CitationBase,
  ReferenceListBase,
  RenderInlineMath,
  RenderBlockMath,
];
