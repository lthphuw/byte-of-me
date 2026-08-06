import type { CSSProperties } from 'react';

/**
 * The ONE definition of a tree row's box.
 *
 * Four things draw a row-shaped thing at the same indent: the row itself, the
 * inline input a draft or a rename turns it into, the placeholder an expanding
 * folder shows, and the first-paint skeleton. They drifted apart — the
 * placeholder was an `h-6` bar in a row that is `min-h-9` and sat in no column
 * at all, which is why an expanding folder never read as "children are
 * arriving" and the author called the skeleton ugly.
 *
 * Sharing the geometry rather than the component: the four differ completely in
 * what they contain and in which element is interactive, so a single component
 * with four modes would be worse. What they must agree on is the box.
 */

/**
 * The row's BOX — height, rhythm, gaps. Everything row-shaped uses this,
 * including the placeholders, which carry no interactive behaviour.
 *
 * `min-h-9` is a 36px touch target on a phone; above `md` the height is handed
 * back to the content, which is why a placeholder has to reproduce the title's
 * line box rather than just its bar (see `NoteRowSkeleton`).
 */
export const NOTE_ROW_BOX_CLASS =
  'flex min-h-9 items-center gap-1 rounded-md pr-1 md:min-h-0';

/** The box plus what only a real, interactive row needs. */
export const NOTE_ROW_CLASS = `group ${NOTE_ROW_BOX_CLASS} text-sm transition-colors`;

/**
 * Where the expand chevron sits — reserved even on a leaf, so titles align.
 *
 * 36px, and that number is MEASURED, not chosen. The chevron is a shadcn
 * `Button` with `size="icon"`, whose own sizing classes beat a smaller utility
 * passed in through `cn`: the button renders 36×36 no matter what this says.
 * The column has therefore always been 36px wide, and a row 36px tall, driven
 * by that button rather than by `min-h-9`.
 *
 * This constant used to say `size-7` (28px) — inert on the button itself, but
 * honoured by every OTHER thing that reserves the column, which is exactly how
 * the draft row and the skeleton ended up 8px short with their icons in the
 * wrong place. Verified in the running app: real title icon at x=116, draft
 * icon at x=108, before this.
 */
export const NOTE_ROW_CHEVRON_CLASS = 'size-9 shrink-0';

/** The file/folder icon. */
export const NOTE_ROW_ICON_CLASS = 'size-3.5 shrink-0';

/** The title area, between the icon and the actions slot. */
export const NOTE_ROW_BODY_CLASS =
  'flex min-w-0 flex-1 items-center gap-2 py-1.5';

const INDENT_STEP = 12;
const INDENT_BASE = 4;

/**
 * Indentation is inline rather than a Tailwind class because the depth is data
 * — an arbitrarily deep tree cannot be expressed as a fixed scale.
 */
export function noteRowIndent(depth: number): CSSProperties {
  return { paddingLeft: `${depth * INDENT_STEP + INDENT_BASE}px` };
}
