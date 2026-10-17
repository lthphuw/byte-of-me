/**
 * Plain module (no `'use client'`): the server-component skeleton imports these classes. One column
 * at every width (the homepage column is `max-w-3xl`, too narrow for a split): rule, title and
 * proof links, demo, details. Demo and details share the card's inner width.
 */

/**
 * One work inside the list's card (`divide-y` draws the rules). The card and side padding match the
 * open-source and education blocks (one page edge); the head/demo/details gap is the in-block step
 * (16 then 24px).
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
 * One proof link as plain `#123` text, underlined like every site link. `min-h-11 -my-2` gives a
 * 44px hit area without adding line height; with no side padding, numbers sit at the row's
 * `gap-x-3`, hit areas 12px apart.
 */
export const WORK_LINK =
  '-my-2 inline-flex min-h-11 items-center rounded-sm text-sm font-medium tabular-nums text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * The details: the compact body size used across the homepage, the card's full inner width.
 * `ExpandableRichText` clamps it to three 28px lines and adds the toggle only when it is longer.
 */
export const WORK_BODY = 'min-w-0 text-[15px] leading-7';
