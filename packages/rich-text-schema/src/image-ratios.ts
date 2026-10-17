import { isPixelSize, type PixelSize } from '@byte-of-me/ui-utils';

/** Image source URL → its stored pixel size. Only the sources a document uses are looked up. */
export type ImageSizes = Record<string, PixelSize>;

/** The `src` attribute as the sanitizer wrote it, decoded back to the URL it came from. */
function sourceOf(tag: string): string | undefined {
  const raw = /\ssrc="([^"]*)"/.exec(tag)?.[1];
  return raw?.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * Gives each body image its own box before it draws. Runs after sanitizing, on markup it sees
 * whole; the one value written is two checked integers, so nothing from the content reaches the
 * style. An image with no stored size keeps the stylesheet's 16:9 reservation.
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
    if (!size || !isPixelSize(size)) return tag;

    const selfClosing = tag.endsWith('/>');
    const head = tag.slice(0, selfClosing ? -2 : -1).trimEnd();
    const style = `aspect-ratio: ${size.width} / ${size.height}`;
    return `${head} style="${style}"${selfClosing ? ' />' : '>'}`;
  });
}
