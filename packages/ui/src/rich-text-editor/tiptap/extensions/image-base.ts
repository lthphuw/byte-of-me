// Schema-and-render half of the two image nodes: names, attributes, parse
// rules and the HTML they serialize to. Everything `generateHTML` needs — and
// nothing it doesn't.
//
// Kept free of `ReactNodeViewRenderer`, commands and any import that reaches
// the package barrel, so `render-extensions.ts` can register these directly
// instead of re-declaring them. The attribute set used to be written out twice
// — once here, once in the render schema — with a comment asking the next
// reader to keep the copies identical; `image.tsx` and `image-group.tsx` now
// extend these with their node views, so the published page and the editor
// cannot drift. Same split as `references/citation-base.ts`.
import { mergeAttributes, Node } from '@tiptap/core';
import Image from '@tiptap/extension-image';

/** ProseMirror node name of a row of images. */
export const IMAGE_GROUP_NAME = 'imageGroup';

/** `data-type` of a captioned single image, and of a row. */
export const IMAGE_FIGURE_TYPE = 'image-figure';
export const IMAGE_GROUP_TYPE = 'image-group';

/** Uploads one file and resolves to its public URL. */
export type ImageUploadFn = (file: File) => Promise<string>;

type Spec = [string, ...unknown[]];

/** A node's caption, trimmed. `''` when it has none. */
export function captionOf(node: {
  attrs?: Record<string, unknown> | null;
}): string {
  const caption = node.attrs?.caption;
  return typeof caption === 'string' ? caption.trim() : '';
}

/** The `<figcaption>` that is a direct child of `element`, as text. */
function ownCaptionText(element: HTMLElement): string {
  for (const child of Array.from(element.children)) {
    if (child.tagName === 'FIGCAPTION') return child.textContent?.trim() ?? '';
  }
  return '';
}

/**
 * The image node.
 *
 * `caption` is not new — it has been in the attribute set (unused) since the
 * node was written, so every document already in the database carries
 * `caption: ''` or nothing at all, and both mean "no caption". An image
 * without one still renders as the bare `<img>` it always did; only a
 * captioned image grows the `<figure>` wrapper, which is what makes the
 * caption a real `<figcaption>` rather than a styled div.
 */
export const ImageBase = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
      height: { default: null },
      align: { default: 'center' },
      // Rendered as the `<figcaption>` below, never as an attribute on the
      // `<img>` (`sanitizeHtml` drops unknown attributes anyway, so emitting
      // it there only produced markup nothing could read).
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') ?? '',
        renderHTML: () => ({}),
      },
      aspectRatio: { default: null },
    };
  },

  parseHTML() {
    return [
      // Our own rendered output. Without this rule a copy of a published
      // paragraph pasted back into the editor keeps the image and silently
      // loses its caption.
      {
        tag: `figure[data-type="${IMAGE_FIGURE_TYPE}"]`,
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;
          const img = element.querySelector('img');
          if (!img) return false;

          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.getAttribute('width') ?? '100%',
            height: img.getAttribute('height'),
            caption: ownCaptionText(element),
          };
        },
      },
      ...(this.parent?.() ?? []),
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const img: Spec = [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];

    const caption = captionOf(node);
    // Byte-identical to the pre-caption output for every stored document.
    if (!caption) return img;

    return [
      'figure',
      { 'data-type': IMAGE_FIGURE_TYPE, class: 'image-figure' },
      img,
      ['figcaption', { class: 'image-caption' }, caption],
    ] as Spec;
  },

  /**
   * Markdown has no figure, so the caption is emitted as the italic line
   * under the image that a reader would write by hand. Lossy in structure and
   * deliberately not in text: the alternative is `renderMarkdown` dropping the
   * attribute, and the notes workspace round-trips the whole document through
   * markdown every time the author toggles raw mode — a caption that vanished
   * there would vanish from the saved note too.
   */
  renderMarkdown: (node) => {
    const attrs = node.attrs ?? {};
    const src = typeof attrs.src === 'string' ? attrs.src : '';
    const alt = typeof attrs.alt === 'string' ? attrs.alt : '';
    const title = typeof attrs.title === 'string' ? attrs.title : '';

    const image = title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
    const caption = captionOf(node);

    return caption ? `${image}\n\n*${caption}*` : image;
  },
});

/**
 * Two or more images shown side by side, with one caption for the whole row.
 *
 * A separate node rather than an attribute on `image`, because the row is a
 * container: it owns the caption that describes the set, and it is the element
 * `@media print`'s `figure { break-inside: avoid }` keeps on one page. Stored
 * documents are untouched — nothing existing parses as an `imageGroup`, and a
 * document that has never seen one is byte-identical through this schema.
 *
 * `image*`, not `image+`, and the difference is not cosmetic. Measured against
 * this schema with `image+`: deleting the only image of a row — through
 * `deleteSelection` (Backspace on the selected image) or through a plain
 * `tr.delete` — does not remove it. ProseMirror repairs the row to satisfy
 * `image+` by putting a FRESH EMPTY image node in its place, so the author
 * presses delete and is left with a broken image they cannot get rid of.
 * Allowing the empty row and sweeping it up afterwards (the plugin in
 * `image-group.tsx`) is the only version where every delete path works.
 */
export const ImageGroupBase = Node.create({
  name: IMAGE_GROUP_NAME,
  group: 'block',
  content: 'image*',
  draggable: true,
  // The row is one thing: a selection that starts inside it must not sweep out
  // into the paragraph after it and take half the images with it.
  isolating: true,

  addAttributes() {
    return {
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') ?? '',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `figure[data-type="${IMAGE_GROUP_TYPE}"]`,
        contentElement: '.image-group-items',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;
          return { caption: ownCaptionText(element) };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const caption = captionOf(node);

    // The images go in their own element so the caption can sit outside the
    // row — the `0` content hole has to be the only child of its parent.
    const spec: Spec = [
      'figure',
      mergeAttributes(HTMLAttributes, {
        'data-type': IMAGE_GROUP_TYPE,
        class: 'image-group',
      }),
      ['div', { class: 'image-group-items' }, 0],
    ];

    if (caption) spec.push(['figcaption', { class: 'image-caption' }, caption]);

    return spec;
  },

  /**
   * The row flattens to its images, one block each, plus the caption line —
   * see `ImageBase.renderMarkdown`. Markdown cannot express the layout, so it
   * keeps every image and every word and loses only the arrangement. Without a
   * renderer at all `@tiptap/markdown` returns `''` for an unknown node type,
   * which would silently delete the images.
   */
  renderMarkdown: (node, helpers) => {
    const images = helpers.renderChildren(node.content ?? [], '\n\n');
    const caption = captionOf(node);

    return caption ? `${images}\n\n*${caption}*` : images;
  },
});
