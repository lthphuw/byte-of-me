/**
 * The row's grid classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 */

/** Column tracks and gaps: one full-width column below md, number, title and meta from md. */
export const ROW_TRACKS =
  'grid-cols-1 md:grid-cols-[2rem_1fr_fit-content(45%)] md:gap-x-6';

/** A plain row's header. The loading skeleton renders this same class list. */
export const PLAIN_ROW_HEADER = `grid ${ROW_TRACKS} gap-y-2 py-5`;

/*
 * The text and spacing classes that decide a row's height. The loading skeleton
 * wraps each placeholder bar in the same classes and sizes it with `1lh`, so a
 * bar is exactly one line of the text it stands in for and the heights cannot drift.
 */

/** The title column's stack: title above description. */
export const ROW_BODY_STACK = 'min-w-0 space-y-2';
/**
 * The row number. From md it is the left column, top-aligned to the title's first line.
 * On a phone it is an eyebrow above the title with a hairline running to the card's
 * edge: a column there would leave the text only 244px.
 */
export const ROW_NUMBER_TEXT =
  'flex items-center gap-3 text-xs tabular-nums after:h-px after:flex-1 after:bg-border md:block md:pt-1 md:after:hidden';
export const ROW_TITLE_TEXT = 'font-heading text-lg tracking-tight md:text-xl';
export const ROW_DESCRIPTION_TEXT = 'text-sm leading-relaxed';
/** Below md the meta sits under the title; from md it is the third column. */
export const ROW_META_CELL =
  'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 md:col-start-3 md:flex-col md:items-end md:text-right';

/*
 * A work with a demo or details keeps its header and stacks the rest under the title
 * column: the demo and the action line reach the meta column from md, the details stay
 * in the title track. Set `col-end` and never `col-span-*` next to `col-start-*`: the
 * span shorthand resets the start (Tailwind 3 emits `grid-column: span N / span N`).
 */
export const BODY_ROW = 'md:col-start-2 md:col-end-[-1]';
export const DETAILS_CELL = 'min-w-0 md:col-start-2';
