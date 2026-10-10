/** A stored image's pixel size. Whole numbers, as the database holds them. */
export interface ImageSize {
  width: number;
  height: number;
}

/** Image source URL → its size. Only the sources a document actually uses are looked up. */
export type ImageSizes = Record<string, ImageSize>;

/** Above this a size is a bad value, not a layout hint. */
const MAX_PX = 10_000;

function isWholeSize({ width, height }: ImageSize): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_PX &&
    height <= MAX_PX
  );
}

/** The `src` attribute as the sanitizer wrote it, decoded back to the URL it came from. */
function sourceOf(tag: string): string | undefined {
  const raw = /\ssrc="([^"]*)"/.exec(tag)?.[1];
  return raw?.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * Gives each body image its own box before it draws, from its stored size. It runs
 * after sanitizing and only on markup this module can see whole: the one value it
 * writes is two checked integers, so nothing from the content can reach the style.
 *
 * An image with no stored size keeps the 16:9 reservation the stylesheet gives it.
 */
export function withImageRatios(
  html: string,
  sizes: ImageSizes | undefined
): string {
  if (!sizes || Object.keys(sizes).length === 0) return html;

  return html.replace(/<img\b[^>]*>/g, (tag) => {
    const src = sourceOf(tag);
    if (
      src === undefined ||
      !Object.prototype.hasOwnProperty.call(sizes, src)
    ) {
      return tag;
    }
    const size = sizes[src];
    if (!size || !isWholeSize(size)) return tag;

    const selfClosing = tag.endsWith('/>');
    const head = tag.slice(0, selfClosing ? -2 : -1).trimEnd();
    const style = `aspect-ratio: ${size.width} / ${size.height}`;
    return `${head} style="${style}"${selfClosing ? ' />' : '>'}`;
  });
}
