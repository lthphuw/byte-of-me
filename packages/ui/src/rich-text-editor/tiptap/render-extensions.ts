// Server-safe schema for `generateHTML`. No 'use client' here or in any import: one would
// register the whole editor as a client reference and ship it to every rich-text page.
// Every node/mark the editor can persist must exist here with the same name and attributes.
import { type AnyExtension, mergeAttributes, Node } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Color } from '@tiptap/extension-color';
import Heading from '@tiptap/extension-heading';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {
  Table,
  TableCell,
  TableHeader,
  TableKit,
} from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import type { DOMOutputSpec, Node as ProseMirrorNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';

import { eachScopedHeader, type HeaderScope } from './extensions/header-scopes';
import { ImageBase, ImageGroupBase } from './extensions/image-base';
import { MermaidSize } from './extensions/mermaid-size';
import { CitationBase } from './extensions/references/citation-base';
import { ReferenceListBase } from './extensions/references/reference-list-base';

// `common` registers ~37 languages; this renders on the server, so no grammar reaches the
// client bundle. Unknown languages (mermaid) stay plain text with `language-*` intact,
// which `MermaidBlocks` keys on.
const lowlight = createLowlight(common);

/**
 * Set by `markNumericTableColumns` at render time, never stored, so the editor schema omits it.
 * On the header cell too: alignment belongs to the column, or `AP₅₀` floats left over its figures.
 */
const numericAttribute = {
  numeric: {
    default: false,
    parseHTML: (element: HTMLElement) => element.hasAttribute('data-numeric'),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.numeric ? { 'data-numeric': 'true' } : {},
  },
};

const NumericTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...numericAttribute };
  },
});

/**
 * Header scopes of the table being serialized, keyed by node. A cell's `renderHTML` sees only
 * itself and the table is the last to know its rows; the editor re-renders cells apart from
 * the table, so it uses decorations (`header-scopes-plugin.ts`). Live note: 184 `<th>`, 0 scopes.
 */
const headerScopes = new WeakMap<ProseMirrorNode, HeaderScope>();

/** The rule, from the module both surfaces share. */
function assignHeaderScopes(table: ProseMirrorNode): void {
  eachScopedHeader(table, (cell, scope) => headerScopes.set(cell, scope));
}

/**
 * The table, with one job added: work out its header scopes before its cells
 * are serialized. Tiptap renders a node's own markup before it fills the
 * content hole, so this always runs before the `th`s below read the map.
 */
const ScopedTable = Table.extend({
  renderHTML(props) {
    assignHeaderScopes(props.node);

    // A table with no rows skips upstream: its `createColGroup` returns `{}` and the leftover
    // `undefined` makes the serializer throw (extension-table 3.29.2), blanking the ENTIRE
    // document (`renderRichTextHtml` escapes an object input to '').
    const rendered = props.node.childCount ? this.parent?.(props) : undefined;
    if (rendered) return rendered;

    const table: DOMOutputSpec = [
      'table',
      mergeAttributes(props.HTMLAttributes),
      ['tbody', 0],
    ];
    return this.options.renderWrapper
      ? ['div', { class: 'tableWrapper' }, table]
      : table;
  },
});

const NumericTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...numericAttribute };
  },

  // Upstream's `th` plus the table's scope. Written out, not patched into the parent's spec:
  // adding a key to the attribute object it returns breaks silently on an upstream refactor.
  renderHTML({ node, HTMLAttributes }) {
    const scope = headerScopes.get(node);

    return [
      'th',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        scope ? { scope } : {}
      ),
      0,
    ];
  },
});

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

// The image nodes come from `extensions/image-base.ts`, which the editor's `ImageExtension`
// and `ImageGroup` extend too, so a captioned image renders a <figcaption> and a row a
// <figure> on the published page and in print, not only in the editor.

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
 * Math nodes for stored documents that still hold them (the editor no longer registers them).
 * Without them one `$x$` makes `generateHTML` throw and blanks the document (measured `length 0`).
 * LaTeX goes out as `data-latex` for `MathRenderer`, not KaTeX: `sanitize.ts` drops inline `style`.
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

/**
 * The text, headings, code and marks the editor and the published page agree on.
 * Both lists start from this one, so the invariant at the top of the file holds
 * for them by construction rather than by two copies kept in step.
 */
export const sharedExtensions: AnyExtension[] = [
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
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Subscript,
  Superscript,
  Underline,
  Link,
  Color,
  Highlight.configure({ multicolor: true }),
];

export const renderExtensions: AnyExtension[] = [
  ...sharedExtensions,
  // Read path only: the editor registers `ImageBase` unconfigured, so these
  // never reach what it stores, copies or edits. Body images sit below the
  // fold and must not compete with the cover for bandwidth.
  ImageBase.configure({
    HTMLAttributes: { loading: 'lazy', decoding: 'async' },
  }),
  ImageGroupBase,
  RenderImagePlaceholder,
  Typography,
  // `resizable: false`: widths are an editing affordance. `renderWrapper` emits the editor's
  // `div.tableWrapper` so one set of table rules (`rich-text-html.tsx`, `editor-surface.css`)
  // covers both and scrolls wide tables sideways; `display: block` loses column alignment.
  TableKit.configure({
    // All three replaced below: the table to derive header scopes from the
    // rows it can still see, the cells to carry the numeric-column attribute.
    table: false,
    tableCell: false,
    tableHeader: false,
  }),
  ScopedTable.configure({ resizable: false, renderWrapper: true }),
  NumericTableCell,
  NumericTableHeader,
  CitationBase,
  ReferenceListBase,
  RenderInlineMath,
  RenderBlockMath,
];
