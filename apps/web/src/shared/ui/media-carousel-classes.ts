/**
 * The media carousel's geometry, in a plain module: a loading skeleton is a server component
 * and draws the same slides from these, so it must not import a `'use client'` file.
 */

/** The track pulls left by one gutter, so the first slide starts flush with the card. */
export const MEDIA_TRACK = '-ml-3';

/** One slide's gutter. With the track's pull it is the gap between two slides. */
export const MEDIA_SLIDE = 'pl-3';

/**
 * A slide's width. Several: 85% on a phone and 58% from md, so the next one is only partly in
 * view and invites the swipe. One: full width on a phone; from md it keeps the narrower width
 * unless `fillSingle` asks for the whole row.
 */
export function mediaSlideBasis(count: number, fillSingle = false): string {
  if (count > 1) return 'basis-[85%] md:basis-[58%]';
  return fillSingle ? 'basis-full' : 'basis-full md:basis-[58%]';
}
