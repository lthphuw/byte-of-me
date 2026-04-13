'use client';

import { cn } from '@/shared/lib/utils';
import { extensions } from '@/shared/ui/tiptap/rich-text-editor';

import { generateHTML } from '@tiptap/html';
import DOMPurify from 'isomorphic-dompurify';

export type RichTextProps = {
  content?: string | any;
  className?: string;
  style?: React.CSSProperties;
};

export function RichText({ content, className, style }: RichTextProps) {
  if (!content) return null;

  let htmlContent = '';

  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    htmlContent = generateHTML(json, extensions);
  } catch {
    htmlContent = typeof content === 'string' ? content : '';
  }

  const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
    FORBID_ATTR: ['style'],
  });

  return (
    <div
      className={cn(
        'break-words [word-break:break-word] [overflow-wrap:anywhere]',
        'font-normal leading-7 text-neutral-800 dark:text-neutral-200',

        'prose prose-neutral dark:prose-invert max-w-none',

        // Typography
        '[&_p]:my-3',
        '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-6',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3',

        'prose-code:bg-transparent prose-code:text-inherit',

        // CODE BLOCK
        '[&_pre]:!bg-neutral-900 [&_pre]:!text-neutral-100',
        'dark:[&_pre]:!bg-neutral-950',
        '[&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto',

        '[&_pre_code]:!bg-transparent [&_pre_code]:!text-inherit [&_pre_code]:p-0',

        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
