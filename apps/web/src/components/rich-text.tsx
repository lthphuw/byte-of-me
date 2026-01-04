import DOMPurify from 'isomorphic-dompurify';

import { cn } from '@/lib/utils';

export type RichTextProps = BaseComponentProps & {
  html?: Nullable<string>;
};

export function RichText({ html, className, style }: RichTextProps) {
  if (!html) {
    return null;
  }
  const root = DOMPurify.sanitize(html);
  return (
    <span
      className={cn(
        'text-neutral-200 font-normal leading-7',

        '[&_h1]:text-neutral-100 [&_h1]:text-2xl [&_h1]:font-semibold',
        '[&_h2]:text-neutral-100 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6',
        '[&_h3]:text-neutral-100 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4',

        // paragraph
        '[&_p]:my-3',

        // links
        '[&_a]:text-neutral-300 hover:[&_a]:text-white',

        // lists
        '[&_li]:marker:text-neutral-500',

        // code
        '[&_code]:text-neutral-100 [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded',

        // blockquote
        '[&_blockquote]:border-l-2 [&_blockquote]:border-neutral-500 [&_blockquote]:pl-4 [&_blockquote]:text-neutral-300',

        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: root.toString() }}
    />
  );
}
