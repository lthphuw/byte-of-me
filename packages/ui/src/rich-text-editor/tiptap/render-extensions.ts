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
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table, TableCell, TableHeader, TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import type { DOMOutputSpec, Node as ProseMirrorNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';

import { ImageBase, ImageGroupBase } from './extensions/image-base';
import { CitationBase } from './extensions/references/citation-base';
import { ReferenceListBase } from './extensions/references/reference-list-base';

// `common` registers ~37 languages. This module renders on the server only,
// so the grammars never reach the client bundle — highlight classes are baked
// into the HTML. Unknown languages (e.g. mermaid) fall through as plain text
// with their `language-*` class intact, which the mermaid enhancer keys on.
const lowlight = createLowlight(common);

/**
 * The one attribute `markNumericTableColumns` sets: this cell sits in a column
 * of figures, so the styles should right-align it and stop it wrapping.
 *
 * On the HEADER as well as the body cell, and that is the point of the shared
 * definition — alignment belongs to the column, and a left-aligned `AP₅₀`
 * floating over a right-aligned column of numbers is worse than no alignment
 * at all.
 *
 * Set at render time, never stored — see `numeric-columns.ts` for why. The
 * editor's own schema deliberately does NOT carry it: nothing persists it, so
 * nothing needs to parse it back.
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
 * Which `scope` each header cell of the table currently being serialized
 * carries. Keyed by node identity, populated by the table (below) and read
 * back by the header cell.
 *
 * A side channel because scope is a fact about POSITION and a cell's
 * `renderHTML` is handed only its own node — Tiptap's serializer walks
 * parent-before-children, so the table is the last place that still knows
 * which row a cell sits in. It is not a stored attribute for the same reason
 * `numeric` is not: it is derived from the shape of the table, so a stored
 * copy goes stale the moment a row is added. A WeakMap keyed on the node
 * (as in `numbering.ts`) means the entries die with the render.
 *
 * Why it matters more than it looks: without `scope`, assistive tech has to
 * guess which header describes a cell, and on a benchmark table that guess IS
 * the meaning of the number being read out. The live survey note had 184
 * `<th>` elements and not one `scope`.
 */
const headerScopes = new WeakMap<ProseMirrorNode, 'col' | 'row'>();

/**
 * The document structure these tables actually have — the same one
 * `editor-surface.css` styles: the FIRST ROW is the header row, and the FIRST
 * CELL of every row is the row label (the column the styles pin).
 *
 * So the first row's cells are column headers, and the first cell of every
 * later row is a row header. The top-left corner belongs to the first row and
 * is scoped `col` there, never both.
 *
 * Only a `tableHeader` is scoped. Whether a row label is a `th` at all is the
 * author's choice, and HTML has no `scope` on a `td` — it was dropped in
 * HTML5, and a screen reader does not treat a `td` as a header no matter what
 * we put on it. A `td` row label therefore gets nothing rather than invalid
 * markup.
 *
 * Nothing here assumes a well-formed table: a row with no cells and a table
 * with no rows both fall through, because a malformed table must still render
 * — `generateHTML` throwing costs the reader the whole document, not one
 * table.
 */
function assignHeaderScopes(table: ProseMirrorNode): void {
  table.forEach((row, _offset, rowIndex) => {
    if (rowIndex === 0) {
      row.forEach((cell) => {
        if (cell.type.name === 'tableHeader') headerScopes.set(cell, 'col');
      });
      return;
    }

    const label = row.firstChild;
    if (label?.type.name === 'tableHeader') headerScopes.set(label, 'row');
  });
}

/**
 * The table, with one job added: work out its header scopes before its cells
 * are serialized. Tiptap renders a node's own markup before it fills the
 * content hole, so this always runs before the `th`s below read the map.
 */
const ScopedTable = Table.extend({
  renderHTML(props) {
    assignHeaderScopes(props.node);

    // A table with no rows never reaches upstream's renderer, and that is not
    // defensive tidiness: it asks `createColGroup` for a `<colgroup>`, which
    // returns `{}` when there is no first row, and the `undefined` left in
    // the output spec makes ProseMirror's serializer throw
    // (`structure.nodeType` of undefined — verified against
    // @tiptap/extension-table 3.29.2). `renderRichTextHtml` catches that and
    // falls back to escaping its input, and its input is an OBJECT — so one
    // empty table costs the reader the ENTIRE document, the same failure the
    // math nodes above were added for.
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

  // Upstream's `th` plus the scope the table worked out. Written out rather
  // than patching the parent's spec, because the parent returns the attribute
  // object it renders and reaching into it to add a key is the kind of thing
  // that breaks silently on an upstream refactor.
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

// The image nodes come from `extensions/image-base.ts` — the same module the
// editor's `ImageExtension` and `ImageGroup` extend, minus their node views.
// This file used to re-declare the image's attribute set and ask the next
// reader to keep the two copies in step; sharing the definition is what makes
// "a captioned image renders a <figcaption>, a row renders a <figure>" true on
// the published page and in the print views, not only inside the editor.

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
  ImageBase,
  ImageGroupBase,
  RenderImagePlaceholder,
  Typography,
  // resizable off: column widths are an editing affordance; rendered tables
  // size themselves from their content.
  //
  // `renderWrapper` puts the `div.tableWrapper` the editor's own node view
  // already creates into the rendered HTML too, so one set of table rules in
  // `rich-text-html.tsx` and `editor-surface.css` can describe both. That
  // wrapper is the horizontal scroll container: a survey table with eleven
  // columns is wider than any reading column, and the alternative — the
  // `display: block` this replaces — throws away the table layout algorithm,
  // which is the thing that keeps columns aligned to each other.
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
