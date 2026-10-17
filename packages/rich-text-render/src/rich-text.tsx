// Deliberately NOT a client component: no state, effects or handlers, and staying on the server
// keeps `generateHTML` and the extension schema (tiptap + prosemirror + lowlight ≈ 1 MB) out of
// visitors' JS. A client component takes rich text as `children`, or HTML via `RichTextHtml`.
import type { ImageSizes } from '@byte-of-me/rich-text-schema';

import { RichTextHtml, type RichTextHtmlProps } from './rich-text-html';
import { renderRichTextHtml } from './rich-text-render';

type RichTextProps = Omit<RichTextHtmlProps, 'html'> & {
  content?: string | unknown;
  /** The stored size of each image the content uses, by source URL. */
  imageSizes?: ImageSizes;
};

export function RichText({ content, imageSizes, ...rest }: RichTextProps) {
  if (!content) return null;

  return (
    <RichTextHtml
      html={renderRichTextHtml(content, { imageSizes })}
      {...rest}
    />
  );
}
