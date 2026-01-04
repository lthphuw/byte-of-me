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
        // base
        'font-normal leading-7',

        // paragraph
        '[&_p]:my-3 [&_p]:text-neutral-800 dark:[&_p]:text-neutral-200',

        // headings
        '[&_h1]:text-neutral-900 dark:[&_h1]:text-neutral-100 [&_h1]:text-2xl [&_h1]:font-semibold',
        '[&_h2]:text-neutral-900 dark:[&_h2]:text-neutral-100 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6',
        '[&_h3]:text-neutral-900 dark:[&_h3]:text-neutral-100 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4',

        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: root.toString() }}
    />
  );
}
