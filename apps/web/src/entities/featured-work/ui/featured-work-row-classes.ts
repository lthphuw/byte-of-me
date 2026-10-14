/**
 * The featured work's classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 *
 * A work is a rule, then its title and its proof links, then its demo, then its details,
 * one column at every width. The homepage column is `max-w-3xl`, too narrow for a split.
 * The demo and the details share the card's full inner width, so their edges line up. The demo is
 * the shared media carousel (`@/shared/ui/media-carousel`), which owns its own geometry.
 */

/**
 * One work, inside the list's card (`divide-y` draws the rules). The card and its side
 * padding match the open-source and education blocks, so the page has one edge. The gap
 * between the head, the demo and the details is the public rhythm's "elements inside a
 * block" step (16 then 24px), so the three read as equal parts between the row's padding.
 */
export const WORK_ROW = 'grid gap-y-4 py-5 md:gap-y-6 md:py-7';

/** The title and its proof links, on one line that wraps on a phone. */
export const WORK_HEAD = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2';

/**
 * The title, at the size of the other homepage item titles: 18px on a phone, 20px from
 * md. Larger titles made this block outweigh the sections around it.
 */
export const WORK_TITLE =
  'font-heading text-lg leading-snug tracking-tight [overflow-wrap:anywhere] md:text-xl';

/** The proof links, in a wrapping row beside the title. */
export const WORK_LINKS = 'flex flex-wrap items-center gap-x-3';

/**
 * One proof link as plain text, `#123`: no box, no border. Underlined at rest like every link
 * on the site. `min-h-11 -my-2` is a 44px-tall hit area that adds no height to the title's
 * line. It has no side padding, so the numbers sit as close as the row's `gap-x-3` says and
 * their hit areas stay 12px apart.
 */
export const WORK_LINK =
  '-my-2 inline-flex min-h-11 items-center rounded-sm text-sm font-medium tabular-nums text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * The details: the compact body size used across the homepage, the card's full inner width.
 * `ExpandableRichText` clamps it to three 28px lines and adds the toggle only when it is longer.
 */
export const WORK_BODY = 'min-w-0 text-[15px] leading-7';
