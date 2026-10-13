/**
 * The featured work's classes, in a plain module: the loading skeleton is a server
 * component and imports these, so they must not sit in a `'use client'` file.
 *
 * A work is a rule, then its title and meta, then its demo, then its details, one
 * column at every width. The homepage column is `max-w-3xl`, too narrow for a split.
 */

/** One work: a rule above it and the space around its parts. */
export const WORK_ROW = 'grid gap-y-4 border-t py-7 md:gap-y-5 md:py-10';

/** The title and the meta line under it. */
export const WORK_HEAD = 'grid min-w-0 gap-2';

/** The title. On a phone it is 24px; from md it is 32px. */
export const WORK_TITLE =
  'font-heading text-2xl leading-[1.2] tracking-tight [overflow-wrap:anywhere] md:text-[2rem] md:leading-[1.15]';

/** The repo and stars, or the host, in one muted line. */
export const WORK_META =
  'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-muted-foreground';

/**
 * The demo strip bleeds to the screen edge on a phone. The shell's gutter is 32px, so
 * the bleed is 32px too. From md the demo sits inside the column again.
 */
export const WORK_MEDIA_BLEED = '-mx-8 px-8 md:mx-0 md:px-0';

/** The details: running text at a comfortable measure. */
export const WORK_BODY = 'min-w-0 max-w-prose text-base leading-[1.65]';
