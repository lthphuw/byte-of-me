'use client';

import * as React from 'react';
import { generateHTML } from '@tiptap/html';

import { cn } from '@/shared/lib/utils';
import { sanitizeHtml } from '@/shared/lib/uuid';
import { extensions } from '@/shared/ui/tiptap/rich-text-editor';

export type RichTextProps = {
  content?: string | unknown;
  className?: string;
  style?: React.CSSProperties;
};

export function RichText({ content, className, style }: RichTextProps) {
  if (!content) return null;

  let htmlContent = '';

  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    htmlContent = generateHTML(json as any, extensions);
  } catch {
    htmlContent = typeof content === 'string' ? content : '';
  }

  return (
    <article
      className={cn(
        'mx-auto w-full max-w-[720px]',
        'break-words [word-break:break-word] [overflow-wrap:anywhere]',
        'text-[17px] leading-8 tracking-[0.01em]',
        'text-neutral-800 dark:text-neutral-200',
        'selection:bg-neutral-200 dark:selection:bg-neutral-700',
        'prose prose-neutral dark:prose-invert max-w-none',

        // Layout rhythm
        '[&_p]:my-5 [&_p]:leading-8',
        '[&_p]:text-[17px]',
        '[&_p:first-child]:mt-0 [&_p:last-child]:mb-0',

        // Headings
        '[&_h1]:mt-14 [&_h1]:mb-6 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-[-0.02em]',
        '[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:tracking-[-0.015em]',
        '[&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:leading-snug',
        '[&_h4]:mt-8 [&_h4]:mb-2 [&_h4]:text-xl [&_h4]:font-medium',

        // Lists
        '[&_ul]:my-5 [&_ol]:my-5',
        '[&_ul]:pl-6 [&_ol]:pl-6',
        '[&_li]:my-1.5',
        '[&_li_p]:my-2',

        // Blockquote
        '[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300',
        'dark:[&_blockquote]:border-neutral-700',
        '[&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-neutral-600',
        'dark:[&_blockquote]:text-neutral-300',

        // Links
        '[&_a]:font-medium [&_a]:text-neutral-950 [&_a]:underline [&_a]:decoration-neutral-300 [&_a]:underline-offset-4',
        'dark:[&_a]:text-neutral-50 dark:[&_a]:decoration-neutral-600',
        '[&_a:hover]:decoration-neutral-500',

        // Strong / emphasis
        '[&_strong]:font-semibold',
        '[&_em]:italic',

        // Horizontal rule
        '[&_hr]:my-8 [&_hr]:border-neutral-200',
        'dark:[&_hr]:border-neutral-800',

        // Images / media
        '[&_img]:my-6 [&_img]:rounded-2xl [&_img]:shadow-sm',
        '[&_figure]:my-6',

        // Inline code
        '[&_code:not(pre_code)]:rounded-md',
        '[&_code:not(pre_code)]:bg-neutral-100',
        '[&_code:not(pre_code)]:px-1.5',
        '[&_code:not(pre_code)]:py-0.5',
        '[&_code:not(pre_code)]:font-mono',
        '[&_code:not(pre_code)]:text-[0.92em]',
        '[&_code:not(pre_code)]:text-neutral-800',

        'dark:[&_code:not(pre_code)]:bg-neutral-800',
        'dark:[&_code:not(pre_code)]:text-neutral-100',

        // Tables
        '[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden',
        '[&_th]:border-b [&_th]:border-neutral-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left',
        'dark:[&_th]:border-neutral-800',
        '[&_td]:border-b [&_td]:border-neutral-200 [&_td]:px-3 [&_td]:py-2',
        'dark:[&_td]:border-neutral-800',

        // Editor-specific polish
        '[&_br]:leading-[0]',
        '[&_p>*:first-child]:mt-0',
        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
    />
  );
}
