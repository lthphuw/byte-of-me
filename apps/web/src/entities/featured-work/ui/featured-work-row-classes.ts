/**
 * The row's grid classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 */

/** Column tracks and gaps: the title column alone below md, the meta column from md. */
export const ROW_TRACKS =
  'grid-cols-[2rem_1fr] gap-x-4 md:grid-cols-[2rem_1fr_fit-content(45%)] md:gap-x-6';

/** A plain row's header. The loading skeleton renders this same class list. */
export const PLAIN_ROW_HEADER = `grid ${ROW_TRACKS} gap-y-2 py-5`;

/*
 * The text and spacing classes that decide a row's height. The loading skeleton
 * wraps each placeholder bar in the same classes and sizes it with `1lh`, so a
 * bar is exactly one line of the text it stands in for and the heights cannot drift.
 */

/** The title column's stack: title above description. */
export const ROW_BODY_STACK = 'min-w-0 space-y-2';
/** The row number: top-aligned to the title's first line. */
export const ROW_NUMBER_TEXT = 'pt-1 text-xs tabular-nums';
export const ROW_TITLE_TEXT = 'font-heading text-lg tracking-tight md:text-xl';
export const ROW_DESCRIPTION_TEXT = 'text-sm leading-relaxed';
/** Below md the meta sits under the title; from md it is the third column. */
export const ROW_META_CELL =
  'col-start-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 md:col-start-3 md:flex-col md:items-end md:text-right';
