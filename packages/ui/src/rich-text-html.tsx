// Deliberately free of tiptap imports: the presentational half of `RichText`, safe for client
// components. It prints already-sanitized HTML — only feed it `renderRichTextHtml` output
// (./rich-text-render), never raw user input.
import * as React from 'react';
import { cn } from '@byte-of-me/ui-utils';

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
  '[&_.tableWrapper]:my-3',
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
        'mx-auto w-full',
        'break-words [word-break:break-word] [overflow-wrap:anywhere]',
        'text-[17px] leading-8 tracking-[0.01em]',
        'text-foreground',
        'selection:bg-primary/20',
        // The typography plugin's own palette, pointed at the theme tokens: it
        // follows light/dark through the variables, so no `dark:` twin is needed.
        'prose max-w-none',
        '[--tw-prose-body:hsl(var(--foreground))] [--tw-prose-headings:hsl(var(--foreground))]',
        '[--tw-prose-lead:hsl(var(--muted-foreground))] [--tw-prose-links:hsl(var(--primary))]',
        '[--tw-prose-bold:hsl(var(--foreground))] [--tw-prose-counters:hsl(var(--muted-foreground))]',
        '[--tw-prose-bullets:hsl(var(--muted-foreground))] [--tw-prose-hr:hsl(var(--border))]',
        '[--tw-prose-quotes:hsl(var(--foreground))] [--tw-prose-quote-borders:hsl(var(--border))]',
        '[--tw-prose-captions:hsl(var(--muted-foreground))] [--tw-prose-code:hsl(var(--foreground))]',
        '[--tw-prose-pre-code:hsl(var(--foreground))] [--tw-prose-pre-bg:hsl(var(--muted))]',
        '[--tw-prose-th-borders:hsl(var(--border))] [--tw-prose-td-borders:hsl(var(--border))]',

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
        '[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-border',
        '[&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',

        // Links
        '[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-4',
        'can-hover:[&_a:hover]:decoration-primary',

        // Strong / emphasis
        '[&_strong]:font-semibold',
        '[&_em]:italic',

        // Horizontal rule
        '[&_hr]:my-8 [&_hr]:border-border',

        // Images / media. `auto 16/9` reserves a muted box before an image draws, so text below does
        // not jump; once loaded, `auto` takes the file's ratio. The body's <img> has no width or
        // height, so this is the only reservation it gets.
        '[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:shadow-sm [&_img]:aspect-[auto_16/9] [&_img]:bg-muted',
        '[&_figure]:my-6 [&_figure]:max-w-full',

        // Image row (`imageGroup`): column first, row from `sm`; two images at 375px are illegible
        // and letting them shrink puts a horizontal scrollbar on the page. `min-w-0` on the items
        // is what allows the shrink (flex children default to their content width).
        '[&_.image-group-items]:flex [&_.image-group-items]:flex-col [&_.image-group-items]:gap-3',
        'sm:[&_.image-group-items]:flex-row sm:[&_.image-group-items]:items-start',
        '[&_.image-group-items>*]:min-w-0 [&_.image-group-items>*]:flex-1',
        // The row owns the vertical rhythm; its images and any per-image
        // figure inside it must not add their own.
        '[&_.image-group-items_img]:my-0 [&_.image-group-items_img]:w-full',
        '[&_.image-group-items>figure]:my-0',

        // Captions. Real `<figcaption>`s, quiet and centred under what they
        // describe.
        '[&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm',
        '[&_figcaption]:text-muted-foreground',

        // Inline code
        '[&_code:not(pre_code)]:rounded-md',
        '[&_code:not(pre_code)]:bg-muted',
        '[&_code:not(pre_code)]:px-1.5',
        '[&_code:not(pre_code)]:py-0.5',
        '[&_code:not(pre_code)]:font-mono',
        '[&_code:not(pre_code)]:text-[0.92em]',
        '[&_code:not(pre_code)]:text-foreground',

        // Code blocks — must scroll horizontally instead of overflowing the
        // column (long lines don't wrap), otherwise they widen the page on
        // narrow viewports.
        '[&_pre]:my-6 [&_pre]:max-w-full [&_pre]:overflow-x-auto',

        // Tables scroll in `div.tableWrapper` (`renderWrapper`; the editor's node view makes the same
        // box), never `table {display:block}`: that drops table layout, so columns stop aligning and
        // `width:100%` means nothing. The frame sits on the wrapper, so a scrolled table stays framed.
        '[&_.tableWrapper]:my-6 [&_.tableWrapper]:max-w-full [&_.tableWrapper]:overflow-x-auto',
        // Scrolling a table to its end must not then drag the page sideways.
        '[&_.tableWrapper]:overscroll-x-contain',
        '[&_.tableWrapper]:rounded-xl [&_.tableWrapper]:border [&_.tableWrapper]:border-border',

        // `table-auto` + `min-w-full`, never `table-fixed`: fixed splits the column evenly (11 columns
        // = 77px each, headings wrapped) and always fits, so never scrolls. `w-full` as in
        // editor-surface.css: under `table-auto` it is a preference, so a wide table still overflows.
        '[&_table]:my-0 [&_table]:w-full [&_table]:min-w-full [&_table]:table-auto',
        // `border-separate`, because a collapsed table owns its borders and the
        // pinned column below would leave its own behind when it sticks.
        '[&_table]:border-separate [&_table]:border-spacing-0',

        // A TABLE IS NOT PROSE: each cell holds a `<p>` that would inherit the 17px/32px article
        // rhythm (a three-line cell = 96px). 14px on a 1.45 line, as in Notion and spreadsheets,
        // makes it 60px, close enough to track across rows.
        '[&_table]:text-[14px] [&_table]:tabular-nums',
        '[&_th>p]:my-0 [&_th>p]:text-[14px] [&_th>p]:leading-[1.45]',
        '[&_td>p]:my-0 [&_td>p]:text-[14px] [&_td>p]:leading-[1.45]',

        // The floor that lets a table be wider than its column. Without it
        // every cell shrinks to its longest word, nothing overflows, and there
        // is nothing to scroll.
        '[&_th]:min-w-[7ch] [&_td]:min-w-[7ch]',
        '[&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold',
        // Headings are labels, not prose: wrapping "Latency (ms)" over three
        // lines to save 40px makes the table harder to read, not narrower.
        '[&_th]:whitespace-nowrap [&_th]:bg-muted',
        '[&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top',

        // Numeric columns (`markNumericTableColumns`): read by the last digit, so right-aligned and
        // never wrapped, and they need a fraction of a sentence's width, which is where an
        // eleven-column table's excess width goes.
        '[&_[data-numeric]]:text-right [&_[data-numeric]]:whitespace-nowrap',
        '[&_[data-numeric]]:min-w-[5ch]',

        // Hairlines. At full strength, eleven columns of grid read as the
        // subject of the table and the figures as the background.
        '[&_tr>*]:border-b [&_tr>*]:border-border/70',
        '[&_tr>*+*]:border-l [&_tr>*+*]:border-border/70',
        // The wrapper draws the outer frame, so the last row must not double it.
        '[&_tr:last-child>*]:border-b-0',

        // Row hover. On a table too wide to see at once, this is what keeps
        // the eye on one row while it travels.
        'can-hover:[&_tbody_tr:hover>td]:bg-muted/60',

        // The row label, pinned while the numbers scroll past it — on a wide
        // table this is the difference between reading a row and guessing which
        // one it is. On a table that already fits, it does nothing.
        '[&_tr>:first-child]:sticky [&_tr>:first-child]:left-0 [&_tr>:first-child]:z-[1]',
        '[&_tr>:first-child]:min-w-[14ch] [&_tr>:first-child]:bg-background',
        // …but a `th` in that column keeps the header fill, which the rule above would remove;
        // `editor-surface.css` keeps `tr > th:first-child` at --muted, so both surfaces agree. Those
        // cells carry `scope`, so the fill is the visual half of the header role.
        '[&_tr>th:first-child]:bg-muted',
        // The pinned column HIDES what scrolls under it, and right-aligned numbers lose leading
        // digits (`25.9M` reads `5.9M`, a plausible wrong number). A 1px `--input` edge (>=3:1 on the
        // page in both themes) shows the overlap; a blur costs a raster op per pinned cell.
        '[&_tr>:first-child]:shadow-[1px_0_0_hsl(var(--input))]',

        // No height cap, no pinned header row: `overflow-x-auto` makes overflow-y `auto` too (CSS
        // Overflow 3 §3), so a cap adds a scroll axis and a wheel over a table scrolls it, not the
        // page (3 ticks, 0px). content-visibility on 30 tables: ~280ms -> ~43ms recalc per invalidation.
        '[&_.tableWrapper]:[content-visibility:auto]',
        '[&_.tableWrapper]:[contain-intrinsic-size:auto_400px]',

        // Citation markers — quiet inline chips that invert on hover so it is
        // obvious they are clickable without shouting mid-sentence.
        '[&_sup.citation]:scroll-mt-40 xl:[&_sup.citation]:scroll-mt-28',
        '[&_sup.citation]:align-super [&_sup.citation]:text-[0.7em] [&_sup.citation]:tabular-nums',
        '[&_sup.citation>a]:rounded [&_sup.citation>a]:bg-muted [&_sup.citation>a]:px-1 [&_sup.citation>a]:py-px',
        '[&_sup.citation>a]:transition-colors [&_sup.citation>a]:duration-500',
        // Jump-back highlight, the inverse of .references-item's flash: the backlink script adds
        // .is-flash to the exact marker <a> (origins map) or, on deep links, the whole <sup>.
        '[&_sup.citation.is-flash>a]:bg-foreground [&_sup.citation.is-flash>a]:text-background',
        '[&_sup.citation>a.is-flash]:bg-foreground [&_sup.citation>a.is-flash]:text-background',
        '[&_sup.citation>a]:font-medium [&_sup.citation>a]:text-muted-foreground [&_sup.citation>a]:no-underline',
        'can-hover:[&_sup.citation>a:hover]:bg-foreground can-hover:[&_sup.citation>a:hover]:text-background',
        '[&_sup.citation--orphan]:text-muted-foreground',

        // Bibliography rendered from the `referenceList` node
        '[&_section.references]:mt-14 [&_section.references]:border-t [&_section.references]:pt-8',
        '[&_section.references]:border-border',
        '[&_.references-title]:mb-4 [&_.references-title]:mt-0 [&_.references-title]:text-lg',
        '[&_.references-title]:font-semibold [&_.references-title]:tracking-normal',
        '[&_.references-list]:my-0 [&_.references-list]:list-decimal [&_.references-list]:space-y-2 [&_.references-list]:pl-6',
        '[&_.references-item]:scroll-mt-40 xl:[&_.references-item]:scroll-mt-28',
        '[&_.references-item]:rounded [&_.references-item]:px-1.5 [&_.references-item]:py-0.5',
        '[&_.references-item]:text-[15px] [&_.references-item]:leading-7 [&_.references-item]:transition-colors [&_.references-item]:duration-500',
        // Jump target highlight. `:target` keeps it working without JS.
        '[&_.references-item:target]:bg-muted',
        '[&_.references-item.is-flash]:bg-muted',
        '[&_.references-url]:ml-1 [&_.references-url]:break-all [&_.references-url]:text-[0.92em]',
        '[&_.references-backlink]:ml-2 [&_.references-backlink]:text-muted-foreground [&_.references-backlink]:no-underline',
        'can-hover:[&_.references-backlink:hover]:text-foreground',

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
