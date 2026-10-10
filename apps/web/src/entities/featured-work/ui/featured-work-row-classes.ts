/**
 * The row's grid classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 */

/** Column tracks and gaps: the title column alone below md, the meta column from md. */
export const ROW_TRACKS =
  'grid-cols-[2rem_1fr] gap-x-4 md:grid-cols-[2rem_1fr_fit-content(45%)] md:gap-x-6';

/** A plain row's header. The loading skeleton renders this same class list. */
export const PLAIN_ROW_HEADER = `grid ${ROW_TRACKS} gap-y-2 py-5`;
