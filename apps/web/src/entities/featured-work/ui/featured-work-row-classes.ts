/**
 * The featured work's classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 *
 * A work is a rule, then its title and its proof links, then its demo, then its details,
 * one column at every width. The homepage column is `max-w-3xl`, too narrow for a split.
 * The demo and the details share the card's full inner width, so their edges line up.
 */

/**
 * One work, inside the list's card (`divide-y` draws the rules). The card and its side
 * padding match the open-source and education blocks, so the page has one edge.
 */
export const WORK_ROW = 'grid gap-y-3 py-5 md:gap-y-4 md:py-7';

/** The title and its proof links, on one line that wraps on a phone. */
export const WORK_HEAD = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2';

/**
 * The title, at the size of the other homepage item titles: 18px on a phone, 20px from
 * md. Larger titles made this block outweigh the sections around it.
 */
export const WORK_TITLE =
  'font-heading text-lg leading-snug tracking-tight [overflow-wrap:anywhere] md:text-xl';

/** The proof links, in a wrapping row beside the title. */
export const WORK_LINKS = 'flex flex-wrap items-center gap-x-6';

/**
 * One proof link as plain text, `#123`: no box, no border. Underlined at rest like every link
 * on the site. The 44px-tall hit area and its 8px of side padding are cancelled by negative
 * margins, so the line stays as tall and the text as close as if they were not there; the
 * row's `gap-x-6` then leaves 8px between two hit areas.
 */
export const WORK_LINK =
  '-mx-2 -my-2 inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-medium tabular-nums text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * The details: the compact body size used across the homepage, the card's full inner width.
 * `ExpandableRichText` clamps it to three 28px lines and adds the toggle only when it is longer.
 */
export const WORK_BODY = 'min-w-0 text-[15px] leading-7';

/**
 * The demo strip bleeds to the card's edge on a phone, past the card's 16px padding, so
 * a second clip shows at the edge. From sm there is nothing to swipe, so it sits inside
 * the card's padding.
 */
export const WORK_MEDIA_BLEED = '-mx-4 px-4 sm:mx-0 sm:px-0';

/**
 * The demo's box, shared with the loading skeleton so the two cannot drift. On a phone it
 * is a swipeable strip; from sm it is a grid, so no clip is ever cut off by the card.
 */
export const WORK_DEMO =
  'flex min-w-0 snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto [scrollbar-width:none] sm:gap-4 sm:overflow-visible [&>figure]:shrink-0 [&>figure]:snap-start';

/**
 * A pair: on a phone each clip is 82% of the strip, so the next one peeks in at the edge
 * and invites the swipe; from sm the two share the row in equal columns.
 */
export const WORK_DEMO_PAIR =
  '[&>figure]:w-[82%] sm:grid sm:grid-cols-2 sm:[&>figure]:w-auto';

/** A lone clip fills the row at every width. */
export const WORK_DEMO_SINGLE = '[&>figure]:w-full';
