'use client';

import { generateHTML } from '@tiptap/html';
import DOMPurify from 'isomorphic-dompurify';

import { cn } from '@/lib/utils';
import { extensions } from '@/components/tiptap/rich-text-editor';





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
  } catch (e) {
    htmlContent = typeof content === 'string' ? content : '';
  }

  const sanitizedHtml = DOMPurify.sanitize(htmlContent);

  return (
    <div
      className={cn(
        'font-normal leading-7 text-neutral-800 dark:text-neutral-200',

        // Typography reset for Tiptap
        'prose prose-neutral dark:prose-invert max-w-none',

        // Custom Overrides (using your specific Tailwind selectors)
        '[&_p]:my-3',
        '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:text-neutral-900 dark:[&_h1]:text-neutral-100',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:text-neutral-900 dark:[&_h2]:text-neutral-100',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3',
        '[&_li::marker]:text-neutral-400',

        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
