/**
 * The ONE definition of an attachment row's box.
 *
 * Three things draw a row in this panel: the real one, the disabled row an
 * upload in flight leaves in its place, and the loading placeholder. They must
 * agree on the height above all — `note-links` records what happens when those
 * copies drift, and here the number is load-bearing for a second reason:
 * `min-h-11` is 44px, the touch target this repo just finished raising every
 * navigation row to. A row that only sets padding regresses it silently.
 *
 * `min-h-*` rather than `h-*` so a long file name that wraps its second line
 * grows the row instead of overflowing it.
 */
export const ATTACHMENT_ROW_CLASS =
  'flex min-h-11 items-center gap-1 rounded-md';
