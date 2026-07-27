// Deliberately free of tiptap imports: this is the presentational half of
// `RichText`, safe to import from client components (the projects timeline
// receives its HTML pre-rendered by a server action). It prints
// already-sanitized HTML — only ever feed it the output of
// `renderRichTextHtml` (./rich-text-render), never raw user input.
import * as React from 'react';

import { cn } from './lib/utils';

export type RichTextHtmlProps = {
  /** Sanitized HTML produced by `renderRichTextHtml`. */
  html?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * `article` is the full reading column used by blog posts. `compact` keeps
   * the same typographic rules at a smaller scale for prose embedded in a
   * card or list item, where the article rhythm is far too loose.
   */
  variant?: 'article' | 'compact';
};

/**
 * Overrides layered on top of the article styles. Kept as overrides rather
 * than a parallel class list so the two variants can never drift apart —
 * `cn` (tailwind-merge) resolves the duplicated utilities to these.
 */
const compactClasses = [
  'mx-0 max-w-none',
  'text-[15px] leading-7',

  '[&_p]:my-3 [&_p]:text-[15px] [&_p]:leading-7',

  '[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-xl',
  '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg',
  '[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-base',
  '[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-base',

  '[&_ul]:my-3 [&_ol]:my-3 [&_ul]:pl-5 [&_ol]:pl-5',
  '[&_li]:my-1 [&_li_p]:my-1',

  '[&_blockquote]:my-3 [&_blockquote]:pl-4',
  '[&_hr]:my-4',
  '[&_pre]:my-3',
  '[&_table]:my-3',
  '[&_img]:my-3 [&_img]:rounded-xl',
  '[&_figure]:my-3',
];

export function RichTextHtml({
  html,
  className,
  style,
  variant = 'article',
}: RichTextHtmlProps) {
  if (!html) return null;

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
        // The document's first block starts flush regardless of its type —
        // an article opening with a heading must not inherit the mid-article
        // heading margin (h2's mt-12 pushed About 48px below every other page).
        '[&_>:first-child]:mt-0',

        // Headings
        '[&_h1]:mt-14 [&_h1]:mb-6 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-[-0.02em]',
        '[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:tracking-[-0.015em]',
        '[&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:leading-snug',
        '[&_h4]:mt-8 [&_h4]:mb-2 [&_h4]:text-xl [&_h4]:font-medium',

        // Anchor landing offset. Below xl the article page floats a sticky
        // table-of-contents bar under the fixed header, so a jumped-to heading
        // needs to clear both; from xl the bar moves into the side rail.
        '[&_h2]:scroll-mt-40 [&_h3]:scroll-mt-40',
        'xl:[&_h2]:scroll-mt-28 xl:[&_h3]:scroll-mt-28',

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
        '[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:shadow-sm',
        '[&_figure]:my-6 [&_figure]:max-w-full',

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

        // Code blocks — must scroll horizontally instead of overflowing the
        // column (long lines don't wrap), otherwise they widen the page on
        // narrow viewports.
        '[&_pre]:my-6 [&_pre]:max-w-full [&_pre]:overflow-x-auto',

        // Tables — become their own horizontal scroll area on narrow viewports
        // (display:block lets a wide table scroll instead of widening the page).
        '[&_table]:my-6 [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse',
        '[&_th]:border-b [&_th]:border-neutral-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left',
        'dark:[&_th]:border-neutral-800',
        '[&_td]:border-b [&_td]:border-neutral-200 [&_td]:px-3 [&_td]:py-2',
        'dark:[&_td]:border-neutral-800',

        // Citation markers — quiet inline chips that invert on hover so it is
        // obvious they are clickable without shouting mid-sentence.
        '[&_sup.citation]:scroll-mt-40 xl:[&_sup.citation]:scroll-mt-28',
        '[&_sup.citation]:align-super [&_sup.citation]:text-[0.7em] [&_sup.citation]:tabular-nums',
        '[&_sup.citation>a]:rounded [&_sup.citation>a]:bg-neutral-100 [&_sup.citation>a]:px-1 [&_sup.citation>a]:py-px',
        '[&_sup.citation>a]:transition-colors [&_sup.citation>a]:duration-500',
        // Jump-back landing highlight — the inverse of .references-item's
        // flash: the backlink script tags the marker with .is-flash and the
        // chip inverts for a moment so the eye finds where it landed.
        // The backlink script flashes either the exact marker <a> the reader
        // came from (origins map) or, on deep links, the whole <sup> — cover
        // both.
        '[&_sup.citation.is-flash>a]:bg-neutral-900 [&_sup.citation.is-flash>a]:text-neutral-50',
        'dark:[&_sup.citation.is-flash>a]:bg-neutral-100 dark:[&_sup.citation.is-flash>a]:text-neutral-900',
        '[&_sup.citation>a.is-flash]:bg-neutral-900 [&_sup.citation>a.is-flash]:text-neutral-50',
        'dark:[&_sup.citation>a.is-flash]:bg-neutral-100 dark:[&_sup.citation>a.is-flash]:text-neutral-900',
        '[&_sup.citation>a]:font-medium [&_sup.citation>a]:text-neutral-700 [&_sup.citation>a]:no-underline',
        'dark:[&_sup.citation>a]:bg-neutral-800 dark:[&_sup.citation>a]:text-neutral-300',
        '[&_sup.citation>a:hover]:bg-neutral-900 [&_sup.citation>a:hover]:text-neutral-50',
        'dark:[&_sup.citation>a:hover]:bg-neutral-100 dark:[&_sup.citation>a:hover]:text-neutral-900',
        '[&_sup.citation--orphan]:text-neutral-400',

        // Bibliography rendered from the `referenceList` node
        '[&_section.references]:mt-14 [&_section.references]:border-t [&_section.references]:pt-8',
        '[&_section.references]:border-neutral-200 dark:[&_section.references]:border-neutral-800',
        '[&_.references-title]:mb-4 [&_.references-title]:mt-0 [&_.references-title]:text-lg',
        '[&_.references-title]:font-semibold [&_.references-title]:tracking-normal',
        '[&_.references-list]:my-0 [&_.references-list]:list-decimal [&_.references-list]:space-y-2 [&_.references-list]:pl-6',
        '[&_.references-item]:scroll-mt-40 xl:[&_.references-item]:scroll-mt-28',
        '[&_.references-item]:rounded [&_.references-item]:px-1.5 [&_.references-item]:py-0.5',
        '[&_.references-item]:text-[15px] [&_.references-item]:leading-7 [&_.references-item]:transition-colors [&_.references-item]:duration-500',
        // Jump target highlight. `:target` keeps it working without JS.
        '[&_.references-item:target]:bg-neutral-100 dark:[&_.references-item:target]:bg-neutral-800',
        '[&_.references-item.is-flash]:bg-neutral-100 dark:[&_.references-item.is-flash]:bg-neutral-800',
        '[&_.references-url]:ml-1 [&_.references-url]:break-all [&_.references-url]:text-[0.92em]',
        '[&_.references-backlink]:ml-2 [&_.references-backlink]:text-neutral-400 [&_.references-backlink]:no-underline',
        '[&_.references-backlink:hover]:text-neutral-900 dark:[&_.references-backlink:hover]:text-neutral-100',

        // Editor-specific polish
        '[&_br]:leading-[0]',
        '[&_p>*:first-child]:mt-0',

        variant === 'compact' && compactClasses,
        className
      )}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
