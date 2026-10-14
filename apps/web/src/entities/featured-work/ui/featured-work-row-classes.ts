/**
 * The featured work's classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 *
 * A work is a rule, then its title and meta, then its demo, then its details, one
 * column at every width. The homepage column is `max-w-3xl`, too narrow for a split.
 */

/**
 * One work, inside the list's card (`divide-y` draws the rules). The card and its side
 * padding match the open-source and education blocks, so the page has one edge.
 */
export const WORK_ROW = 'grid gap-y-3 py-5 md:gap-y-4 md:py-7';

/** The title and the proof links under it. */
export const WORK_HEAD = 'grid min-w-0 gap-1.5';

/** The proof links, one row each, in a tight list. */
export const WORK_LINKS = 'grid gap-2';

/** One proof link: its text, then its meta on the same line, wrapping on a phone. */
export const WORK_LINK = 'flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1';

/** A proof link's text: underlined at rest, as every link in the app is. */
export const WORK_LINK_TEXT =
  'min-w-0 rounded-sm text-[15px] font-medium text-foreground underline decoration-border underline-offset-4 [overflow-wrap:anywhere] hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-base';

/** A pull request's state: a text pill, so the word carries the meaning and colour only adds to it. */
export const WORK_STATE =
  'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs leading-4';

/**
 * The title, at the size of the other homepage item titles: 18px on a phone, 20px from
 * md. Larger titles made this block outweigh the sections around it.
 */
export const WORK_TITLE =
  'font-heading text-lg leading-snug tracking-tight [overflow-wrap:anywhere] md:text-xl';

/** The repo and stars, or the host, in one muted line. */
export const WORK_META =
  'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground md:text-sm';

/**
 * The demo strip bleeds to the card's edge on a phone, past the card's 16px padding, so
 * a second clip shows at the edge. From md the demo sits inside the card's padding.
 */
export const WORK_MEDIA_BLEED = '-mx-4 px-4 md:mx-0 md:px-0';

/** The details: the compact body size used across the homepage. */
export const WORK_BODY = 'min-w-0 max-w-prose text-[15px] leading-7';
