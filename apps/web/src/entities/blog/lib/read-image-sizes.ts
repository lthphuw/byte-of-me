import { prisma } from '@byte-of-me/db';
import {
  collectImageSources,
  parseRichTextContent,
} from '@byte-of-me/ui/lib/rich-text-content';

export type BodyImageSizes = Record<string, { width: number; height: number }>;

/**
 * The stored pixel size of each image a post's body uses, by source URL. The body is
 * drawn from its HTML alone, so the sizes come from the media rows the uploads wrote;
 * a source with no row, or no size, is simply absent and keeps the stylesheet's box.
 */
export async function readBodyImageSizes(
  content: string | null | undefined
): Promise<BodyImageSizes> {
  const sources = collectImageSources(parseRichTextContent(content ?? null));
  if (sources.length === 0) return {};

  const rows = await prisma.media.findMany({
    where: { url: { in: sources } },
    select: { url: true, width: true, height: true },
  });

  const sizes: BodyImageSizes = {};
  for (const row of rows) {
    if (row.width && row.height) {
      sizes[row.url] = { width: row.width, height: row.height };
    }
  }
  return sizes;
}
