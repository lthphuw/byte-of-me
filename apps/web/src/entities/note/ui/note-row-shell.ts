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

/** The box plus what only a real, interactive row needs. `relative` positions
 *  the open note's accent bar; see `NOTE_ROW_ACTIVE_CLASS`. */
export const NOTE_ROW_CLASS = `group relative ${NOTE_ROW_BOX_CLASS} text-sm transition-colors`;

/**
 * The keyboard focus ring, drawn on the ROW box.
 *
 * It used to live on the `<li>`, which is the focusable element (roving
 * tabindex) — but that `li` also CONTAINS this row's children list, so the ring
 * boxed the entire open subtree instead of the row. Verified in the browser:
 * selecting a folder and expanding it drew one rectangle around the folder and
 * all three of its notes. The `li` keeps the focus; only the paint moved down
 * here, via a named group so it survives the drag and context-menu wrappers
 * that sit in between.
 *
 * `focus-visible`, not `focus`, and that distinction is the whole fix for what
 * the author reported. Checked in Chrome on this very tree: after a mouse click
 * the `li` matches `:focus` but NOT `:focus-visible`; after an arrow key it
 * matches both. So clicking a row no longer leaves a ring behind, and arrowing
 * onto one still says where the keyboard is — which is the only case a focus
 * ring is FOR.
 */
export const NOTE_ROW_FOCUS_CLASS =
  'group-focus-visible/row:ring-1 group-focus-visible/row:ring-ring';

/**
 * The explorer's cursor — the row F2, Delete and `n` would act on.
 *
 * It has to be VISIBLE, and that is the whole reason this is not the `bg-muted/60`
 * it started as. `--muted` and `--accent` are both `0 0% 96.1%` in the light
 * theme, so 60% of either over a white background lands around 97.7% — measured
 * in the running app, a selected folder was indistinguishable from an unselected
 * one, which matters because nothing else on screen says where `n` is about to
 * write the next note.
 *
 * THE WASH NOW MEANS EXACTLY ONE THING: this row is the cursor. It used to be
 * shared with the open note, with the two kept apart by weight alone — the same
 * trade VSCode makes with its `inactiveSelectionBackground`. In this theme that
 * did not read: with a note open and a folder clicked, two rows carried an
 * identical `bg-muted` and the author reported the folder as "still focused"
 * after clicking a file. Verified in the browser before this changed.
 *
 * So the two states now use different channels rather than the same one at two
 * weights — see `NOTE_ROW_ACTIVE_CLASS` for the open note's half. The pair the
 * `aria-selected` / `aria-current` note in `note-tree-item.tsx` describes is
 * unchanged; only the paint is.
 */
export const NOTE_ROW_SELECTED_CLASS = 'bg-muted text-foreground';

/**
 * The note open in the editor — the OTHER half of the pair above.
 *
 * Weight, brightness and a 2px bar at the pane's edge, deliberately with no
 * background of its own: a wash here would be indistinguishable from
 * `NOTE_ROW_SELECTED_CLASS`, which is the bug this split exists to fix. The bar
 * is drawn by an element rather than a `before:` pseudo so it does not depend
 * on Tailwind's generated `content`, and it sits at `left-0` — outside the
 * depth indent — so every open note marks the same column no matter how deep
 * it is, the way VSCode's dirty/active gutter does.
 */
export const NOTE_ROW_ACTIVE_CLASS = 'font-medium text-foreground';

/** The bar itself. Its own constant so the skeleton and the rename input can
 *  never accidentally draw one. */
export const NOTE_ROW_ACTIVE_BAR_CLASS =
  'pointer-events-none absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary';

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
