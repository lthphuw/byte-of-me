// Schema-and-render half of the two image nodes: attributes, parse rules, HTML.
// No node views, commands or barrel imports, so `render-extensions.ts` registers
// these directly and `image.tsx` / `image-group.tsx` extend them for the editor.
import { mergeAttributes, Node } from '@tiptap/core';
import Image from '@tiptap/extension-image';

/** ProseMirror node name of a row of images. */
export const IMAGE_GROUP_NAME = 'imageGroup';

/** `data-type` of a captioned single image, and of a row. */
const IMAGE_FIGURE_TYPE = 'image-figure';
const IMAGE_GROUP_TYPE = 'image-group';

/** Uploads one file and resolves to its public URL. */
export type ImageUploadFn = (file: File) => Promise<string>;

type Spec = [string, ...unknown[]];

/** A node's caption, trimmed. `''` when it has none. */
function captionOf(node: {
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
 * The image node. `caption: ''` and no caption both mean "none" and render a bare
 * `<img>`; only a captioned image grows the `<figure>` with a real `<figcaption>`.
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
   * Markdown has no figure: the caption becomes the italic line under the image.
   * Notes round-trip through markdown on every raw-mode toggle, so dropping it
   * here would drop it from the saved note.
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
 * A row of images with one caption. `image*`, not `image+`: measured, `image+` makes
 * ProseMirror refill a deleted last image with an empty one on every delete path;
 * the plugin in `image-group.tsx` sweeps the emptied row instead.
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
   * The row flattens to one image per block plus the caption line. Without a
   * renderer `@tiptap/markdown` returns `''` for an unknown node and the images vanish.
   */
  renderMarkdown: (node, helpers) => {
    const images = helpers.renderChildren(node.content ?? [], '\n\n');
    const caption = captionOf(node);

    return caption ? `${images}\n\n*${caption}*` : images;
  },
});
