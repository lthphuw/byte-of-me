/**
 * The featured work's classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 *
 * A work is a rule, then its title and its proof badges, then its demo, then its details,
 * one column at every width. The homepage column is `max-w-3xl`, too narrow for a split.
 */

/**
 * One work, inside the list's card (`divide-y` draws the rules). The card and its side
 * padding match the open-source and education blocks, so the page has one edge.
 */
export const WORK_ROW = 'grid gap-y-3 py-5 md:gap-y-4 md:py-7';

/** The title and its proof badges, on one line that wraps on a phone. */
export const WORK_HEAD = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2';

/**
 * The title, at the size of the other homepage item titles: 18px on a phone, 20px from
 * md. Larger titles made this block outweigh the sections around it.
 */
export const WORK_TITLE =
  'font-heading text-lg leading-snug tracking-tight [overflow-wrap:anywhere] md:text-xl';

/** The proof badges, in a wrapping row beside the title. */
export const WORK_LINKS = 'flex flex-wrap items-center gap-2';

/**
 * One proof link as a badge. 36px tall, the touch target the rest of the app uses; the
 * text stays the foreground colour, so the badge needs no hue of its own.
 */
export const WORK_BADGE =
  'inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** The details: the compact body size used across the homepage. */
export const WORK_BODY = 'min-w-0 max-w-prose text-[15px] leading-7';

/**
 * The demo strip bleeds to the card's edge on a phone, past the card's 16px padding, so
 * a second clip shows at the edge. From md the demo sits inside the card's padding.
 */
export const WORK_MEDIA_BLEED = '-mx-4 px-4 md:mx-0 md:px-0';
